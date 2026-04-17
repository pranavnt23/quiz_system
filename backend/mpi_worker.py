import sys
import models
from database import SessionLocal

def worker_loop(comm, rank):
    print(f"Worker {rank}: Entering wait loop...")
    while True:
        try:
            # Block and wait for message from Rank 0
            data = comm.recv(source=0, tag=11)
            
            msg_type = data.get("type")
            db = SessionLocal()
            
            if msg_type == "evaluate":
                quiz_id = data.get("quiz_id")
                question_id = data.get("question_id")
                answers = data.get("answers")
                start_ts = data.get("start_ts", 0)
                duration = data.get("duration", 1)
                
                results = []
                for ans in answers:
                    print(f"Worker {rank} -> processing User {ans.get('username')}")
                    
                    option_ids = ans.get("option_ids", [])
                    is_correct = False
                    primary_option_id = option_ids[-1] if option_ids else None
                    
                    correct_opts = db.query(models.Option).filter(models.Option.question_id == question_id, models.Option.is_correct == True).all()
                    correct_opt_ids = {o.id for o in correct_opts}
                    selected_opt_ids = set(option_ids)
                    
                    if selected_opt_ids and selected_opt_ids == correct_opt_ids:
                        is_correct = True
                        for oid in option_ids:
                            if oid in correct_opt_ids:
                                primary_option_id = oid
                                break
                    
                    points = 0
                    if is_correct:
                        time_elapsed = ans.get("timestamp", start_ts) - start_ts
                        if time_elapsed < 0: time_elapsed = 0
                        if time_elapsed > duration: time_elapsed = duration
                        points = int(1000 * (1 - (time_elapsed / duration)))
                        
                    ans["is_correct"] = is_correct
                    ans["points"] = points
                    ans["option_id"] = primary_option_id
                    results.append(ans)
                    
                    if primary_option_id is not None:
                        # Write response to DB safely
                        resp = models.Response(
                            user_id=ans["user_id"],
                            quiz_id=quiz_id,
                            question_id=question_id,
                            option_id=primary_option_id,
                            is_correct=is_correct,
                            points_earned=points,
                            processing_node_id=rank
                        )
                        db.add(resp)
                    
                    # Update Score
                    score = db.query(models.Score).filter(
                        models.Score.user_id == ans["user_id"], 
                        models.Score.quiz_id == quiz_id
                    ).first()
                    
                    if not score:
                        score = models.Score(user_id=ans["user_id"], quiz_id=quiz_id, total_score=points)
                        db.add(score)
                    else:
                        score.total_score += points
                        
                db.commit()
                db.close()
                comm.send(results, dest=0, tag=12)

            elif msg_type == "rank":
                quiz_id = data.get("quiz_id")
                print(f"Worker {rank} -> Computing Leaderboard for quiz {quiz_id}")
                
                # Fetch all scores for quiz, order by total_score desc
                scores = db.query(models.Score).filter(models.Score.quiz_id == quiz_id).order_by(models.Score.total_score.desc()).all()
                
                leaders = []
                rank_count = 1
                for s in scores:
                    s.rank = rank_count
                    
                    user = db.query(models.User).filter(models.User.id == s.user_id).first()
                    leaders.append({
                        "user_id": s.user_id,
                        "username": user.username if user else "Unknown",
                        "rank": rank_count,
                        "score": s.total_score
                    })
                    rank_count += 1
                    
                db.commit()
                db.close()
                
                comm.send(leaders, dest=0, tag=12)
                
            elif msg_type == "exit":
                print(f"Worker {rank} -> Exiting.")
                break
                
        except Exception as e:
            error_trace = f"Worker {rank} FATAL error: {str(e)}"
            print(error_trace)
            
            # HARD WRITE THE ERROR TO A FILE FOR DEBUGGING
            with open(f"worker_{rank}_error.log", "a") as err_log:
                err_log.write(error_trace + "\n")
                
            try:
                comm.send([], dest=0, tag=12) # Unlock master
            except:
                pass
