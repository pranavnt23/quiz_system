import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
import json
from database import SessionLocal
import models
from datetime import datetime

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []
        self.quiz_clients = {} # quiz_id -> [WebSocket]
        self.admins = [] # [WebSocket]
        self.comm = None
        self.size = 1
        
        self.temp_answers = {} # quiz_id -> list of incoming answers during answering phase

    def attach_comm(self, comm, size):
        self.comm = comm
        self.size = size

    async def connect(self, websocket: WebSocket, quiz_id: int = None, is_admin: bool = False):
        await websocket.accept()
        self.active_connections.append(websocket)
        if is_admin:
            self.admins.append(websocket)
        elif quiz_id is not None:
            if quiz_id not in self.quiz_clients:
                self.quiz_clients[quiz_id] = []
            self.quiz_clients[quiz_id].append(websocket)

    def disconnect(self, websocket: WebSocket, quiz_id: int = None, is_admin: bool = False):
        self.active_connections.remove(websocket)
        if is_admin and websocket in self.admins:
            self.admins.remove(websocket)
        elif quiz_id is not None and quiz_id in self.quiz_clients:
            if websocket in self.quiz_clients[quiz_id]:
                self.quiz_clients[quiz_id].remove(websocket)

    async def broadcast_quiz(self, quiz_id: int, message: str):
        if quiz_id in self.quiz_clients:
            for connection in self.quiz_clients[quiz_id]:
                await connection.send_text(message)

    async def broadcast_admin(self, message: str):
        for connection in self.admins:
            await connection.send_text(message)

manager = ConnectionManager()

def initialize(comm, size):
    manager.attach_comm(comm, size)

@router.websocket("/ws/admin")
async def websocket_admin_endpoint(websocket: WebSocket):
    await manager.connect(websocket, is_admin=True)
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            if msg.get("action") == "start_quiz":
                quiz_id = msg.get("quiz_id")
                asyncio.create_task(quiz_flow(quiz_id))
    except WebSocketDisconnect:
        manager.disconnect(websocket, is_admin=True)

@router.websocket("/ws/{quiz_code}/{username}")
async def websocket_client_endpoint(websocket: WebSocket, quiz_code: str, username: str):
    db = SessionLocal()
    quiz = db.query(models.Quiz).filter(models.Quiz.quiz_code == quiz_code).first()
    if not quiz:
        await websocket.close()
        db.close()
        return

    # Add user to DB
    user = models.User(username=username, quiz_id=quiz.id, socket_id=str(id(websocket)))
    db.add(user)
    db.commit()
    db.refresh(user)

    await manager.connect(websocket, quiz.id)
    
    # Send players list to admin
    users = db.query(models.User).filter(models.User.quiz_id == quiz.id).all()
    user_list = [{"id": u.id, "username": u.username} for u in users]
    await manager.broadcast_admin(json.dumps({"type": "players_update", "players": user_list}))
    
    try:
        while True:
            data = await websocket.receive_text()
            packet = json.loads(data)
            if packet.get("action") == "submit_answer":
                if quiz.id not in manager.temp_answers:
                    manager.temp_answers[quiz.id] = []
                manager.temp_answers[quiz.id].append({
                    "user_id": user.id,
                    "question_id": packet.get("question_id"),
                    "option_id": packet.get("option_id"),
                    "timestamp": packet.get("timestamp")
                })
    except WebSocketDisconnect:
        manager.disconnect(websocket, quiz.id)
        db.close()

async def mpi_distribute_eval(quiz_id, question_id, answers, db):
    if manager.size <= 1:
        # Fallback if running without MPI
        for ans in answers:
            opt = db.query(models.Option).filter(models.Option.id == ans["option_id"]).first()
            is_correct = opt.is_correct if opt else False
            ans["is_correct"] = is_correct
            ans["points"] = 100 if is_correct else 0
        return answers

    # Distribute list to workers
    workers = manager.size - 1
    chunks = [[] for _ in range(workers)]
    for i, ans in enumerate(answers):
        chunks[i % workers].append(ans)

    import time
    start_dist_time = time.time()
    
    for i in range(1, manager.size):
        # We send quiz_id, question_id, chunk
        # Since blocking might freeze event loop, wrap in to_thread
        await asyncio.to_thread(manager.comm.send, {
            "type": "evaluate",
            "quiz_id": quiz_id,
            "question_id": question_id,
            "answers": chunks[i-1]
        }, dest=i, tag=11)
        
        await manager.broadcast_admin(json.dumps({
            "type": "log", 
            "log": f"Worker {i} → Assigned {len(chunks[i-1])} answers for evaluation"
        }))

    results = []
    for i in range(1, manager.size):
        res = await asyncio.to_thread(manager.comm.recv, source=i, tag=12)
        results.extend(res)
        await manager.broadcast_admin(json.dumps({
            "type": "log", 
            "log": f"Worker {i} → Finished evaluating. Computed {len(res)} results."
        }))
        
    return results

async def mpi_compute_ranks(quiz_id):
    if manager.size <= 1:
        return []
    
    await asyncio.to_thread(manager.comm.send, {
        "type": "rank",
        "quiz_id": quiz_id
    }, dest=1, tag=11)
    
    await manager.broadcast_admin(json.dumps({
        "type": "log", 
        "log": f"Worker 1 → Computing Leaderboard..."
    }))

    leaders = await asyncio.to_thread(manager.comm.recv, source=1, tag=12)
    return leaders

async def quiz_flow(quiz_id: int):
    # Retrieve quiz details
    db = SessionLocal()
    quiz = db.query(models.Quiz).filter(models.Quiz.id == quiz_id).first()
    quiz.isLive = True
    db.commit()

    questions = db.query(models.Question).filter(models.Question.quiz_id == quiz_id).order_by(models.Question.question_number).all()

    for q in questions:
        # Phase 1: Reading Time
        await manager.broadcast_quiz(quiz_id, json.dumps({
            "phase": 1,
            "question_id": q.id,
            "text": q.question_text,
            "duration": q.time_limit_question
        }))
        await manager.broadcast_admin(json.dumps({"type": "log", "log": f"Phase 1: Reading question {q.question_number}"}))
        await asyncio.sleep(q.time_limit_question)

        # Phase 2: Answering Time
        options = db.query(models.Option).filter(models.Option.question_id == q.id).all()
        opts_list = [{"id": o.id, "text": o.option_text} for o in options]
        
        manager.temp_answers[quiz_id] = [] # Clear previous
        
        await manager.broadcast_quiz(quiz_id, json.dumps({
            "phase": 2,
            "question_id": q.id,
            "options": opts_list,
            "duration": q.time_limit_options,
            "start_ts": datetime.utcnow().timestamp()
        }))
        await manager.broadcast_admin(json.dumps({"type": "log", "log": f"Phase 2: Answering question {q.question_number}"}))
        await asyncio.sleep(q.time_limit_options)

        # Collect Answers
        answers = manager.temp_answers.get(quiz_id, [])
        await manager.broadcast_admin(json.dumps({"type": "log", "log": f"Collected {len(answers)} answers, sending to MPI queue..."}))

        # MPI Eval
        evaluated_results = await mpi_distribute_eval(quiz_id, q.id, answers, db)
        
        # Prepare Option Stats for Admin
        stats = {}
        for ans in evaluated_results:
            o_id = ans["option_id"]
            stats[o_id] = stats.get(o_id, 0) + 1
            
        await manager.broadcast_admin(json.dumps({
            "type": "chart_update",
            "stats": stats
        }))

        # Send individual feedback
        for w in manager.quiz_clients.get(quiz_id, []):
            try:
                # Need to map socket -> user -> result... 
                # This is tricky because we only have sockets. 
                # Alternatively, broadcast result and client filters by their knowledge or we send individually.
                # Since we know users linked to quiz, we can fetch all users and their results.
                pass
            except Exception:
                pass
                
        # To simplify, we send a massive payload, or since we only broadcast, let's do a single broadcast.
        # It's better to broadcast result map
        feedback_map = {res["user_id"]: res["is_correct"] for res in evaluated_results}
        
        # Phase 3: Result Feedback (5s)
        await manager.broadcast_quiz(quiz_id, json.dumps({
            "phase": 3,
            "feedback": feedback_map,
            "correct_option_id": [o.id for o in options if o.is_correct][0] if options else None,
            "duration": 5
        }))
        await asyncio.sleep(5)

        # Phase 4: Leaderboard Display (8s)
        leaders = await mpi_compute_ranks(quiz_id)
        # leaders: [{user_id, username, rank}, ...]
        
        await manager.broadcast_quiz(quiz_id, json.dumps({
            "phase": 4,
            "leaderboard": leaders, # Should only have ranks and usernames mapped
            "duration": 8
        }))
        await asyncio.sleep(8)
        
        # Phase 5: Transition
        await manager.broadcast_quiz(quiz_id, json.dumps({
            "phase": 5,
            "message": "Let's move to the next one",
            "duration": 3
        }))
        await asyncio.sleep(3)

    # Final logic
    final_leaders = await mpi_compute_ranks(quiz_id)
    await manager.broadcast_quiz(quiz_id, json.dumps({
        "phase": 6,  # End
        "leaderboard": final_leaders
    }))
    
    quiz.isLive = False
    db.commit()
    db.close()
