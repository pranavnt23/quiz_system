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
                
                print(f"Worker {rank} → Evaluating {len(answers)} answers for question {question_id}")
                
                results = []
                for ans in answers:
                    opt = db.query(models.Option).filter(models.Option.id == ans["option_id"]).first()
                    is_correct = opt.is_correct if opt else False
                    
                    points = 0
                    if is_correct:
                        # Speed points (using dummy simple formula: basic 100 pt if correct, plus bonus mapping not provided, so let's default 100)
                        # We can add time difference logic if we know when it started.
                        points = 100 
                        
                    ans["is_correct"] = is_correct
                    ans["points"] = points
                    results.append(ans)
                    
                    # Write response to DB
                    resp = models.Response(
                        user_id=ans["user_id"],
                        quiz_id=quiz_id,
                        question_id=question_id,
                        option_id=ans["option_id"],
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
                print(f"Worker {rank} → Computing Leaderboard for quiz {quiz_id}")
                
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
                        "rank": rank_count
                    })
                    rank_count += 1
                    
                db.commit()
                db.close()
                
                comm.send(leaders, dest=0, tag=12)
                
            elif msg_type == "exit":
                print(f"Worker {rank} → Exiting.")
                break
                
        except Exception as e:
            print(f"Worker {rank} error: {str(e)}")
            try:
                comm.send([], dest=0, tag=12) # Unlock master
            except:
                pass
