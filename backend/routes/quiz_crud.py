from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from typing import List
from pydantic import BaseModel
import models
from database import get_db
import string
import random

router = APIRouter()

class OptionCreate(BaseModel):
    option_text: str
    is_correct: bool

class QuestionCreate(BaseModel):
    question_text: str
    question_number: int
    time_limit_options: int
    time_limit_question: int
    options: List[OptionCreate]

class QuizCreate(BaseModel):
    topic: str
    quiz_description: str
    questions: List[QuestionCreate]

def generate_quiz_code(length=6):
    letters = string.ascii_uppercase
    return ''.join(random.choice(letters) for i in range(length))

@router.post("/create")
def create_quiz(quiz_data: QuizCreate, db: Session = Depends(get_db)):
    code = generate_quiz_code()
    while db.query(models.Quiz).filter(models.Quiz.quiz_code == code).first():
        code = generate_quiz_code()
        
    db_quiz = models.Quiz(
        topic=quiz_data.topic,
        quiz_code=code,
        quiz_description=quiz_data.quiz_description,
        isLive=False
    )
    db.add(db_quiz)
    db.commit()
    db.refresh(db_quiz)
    
    for q_data in quiz_data.questions:
        db_question = models.Question(
            quiz_id=db_quiz.id,
            question_text=q_data.question_text,
            question_number=q_data.question_number,
            time_limit_options=q_data.time_limit_options,
            time_limit_question=q_data.time_limit_question
        )
        db.add(db_question)
        db.commit()
        db.refresh(db_question)
        
        for opt_data in q_data.options:
            db_option = models.Option(
                question_id=db_question.id,
                option_text=opt_data.option_text,
                is_correct=opt_data.is_correct
            )
            db.add(db_option)
        db.commit()

    return {"quiz_id": db_quiz.id, "quiz_code": db_quiz.quiz_code}

@router.get("/list")
def list_quizzes(db: Session = Depends(get_db)):
    quizzes = db.query(models.Quiz).all()
    return quizzes

@router.get("/{quiz_id}")
def get_quiz(quiz_id: int, db: Session = Depends(get_db)):
    quiz = db.query(models.Quiz).filter(models.Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    questions = db.query(models.Question).filter(models.Question.quiz_id == quiz.id).all()
    q_out = []
    for q in questions:
        opts = db.query(models.Option).filter(models.Option.question_id == q.id).all()
        q_out.append({
            "id": q.id,
            "text": q.question_text,
            "options": [{"id": o.id, "text": o.option_text, "is_correct": o.is_correct} for o in opts],
            "time_limit_options": q.time_limit_options,
            "time_limit_question": q.time_limit_question
        })
        
    return {
        "id": quiz.id,
        "topic": quiz.topic,
        "quiz_code": quiz.quiz_code,
        "questions": q_out
    }

@router.delete("/{quiz_id}")
def delete_quiz(quiz_id: int, db: Session = Depends(get_db)):
    # 1. Verify the quiz exists
    db_quiz = db.query(models.Quiz).filter(models.Quiz.id == quiz_id).first()
    
    if not db_quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    try:
        # 2. Delete all Options associated with this quiz's questions
        # We use a subquery to find all question IDs belonging to this quiz
        question_ids = db.query(models.Question.id).filter(models.Question.quiz_id == quiz_id).all()
        # Convert list of tuples to flat list: [1, 2, 3]
        q_id_list = [q.id for q in question_ids]

        if q_id_list:
            db.query(models.Option).filter(models.Option.question_id.in_(q_id_list)).delete(synchronize_session=False)

        # 3. Delete all Questions
        db.query(models.Question).filter(models.Question.quiz_id == quiz_id).delete(synchronize_session=False)

        # 4. Clean up related Live tables (LiveQuiz, LiveQuestion) if they exist
        db.query(models.LiveQuestion).filter(models.LiveQuestion.quiz_id == quiz_id).delete(synchronize_session=False)
        db.query(models.LiveQuiz).filter(models.LiveQuiz.quiz_id == quiz_id).delete(synchronize_session=False)

        # 5. Delete the Quiz itself
        db.delete(db_quiz)
        
        db.commit()
        return {"message": f"Quiz {quiz_id} and all related Questions/Options deleted successfully"}

    except Exception as e:
        db.rollback()
        print(f"Error during delete: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error during deletion")


# GET PLAYERS (Lobby/Waiting Room) ---
@router.get("/{quiz_id}/players")
def get_quiz_players(quiz_id: int, db: Session = Depends(get_db)):
    """Fetch currently registered users (waiting room) for the admin."""
    # Simple query as all data is within the User table
    users = db.query(models.User).filter(models.User.quiz_id == quiz_id).all()
    return [
        {
            "id": u.id, 
            "username": u.username, 
            "socket_id": u.socket_id
        } for u in users
    ]

# GET LEADERBOARD (Final Standings) ---
@router.get("/{quiz_id}/leaderboard")
def get_quiz_leaderboard(quiz_id: int, db: Session = Depends(get_db)):
    """Fetch the absolute final leaderboard using a JOIN for efficiency."""
    # We use joinedload to grab User data in the same SQL query
    scores = db.query(models.Score).options(
        joinedload(models.Score.user)
    ).filter(
        models.Score.quiz_id == quiz_id
    ).order_by(
        models.Score.total_score.desc()
    ).all()

    return [
        {
            "user_id": s.user_id,
            "username": s.user.username if s.user else "Unknown",
            "total_score": s.total_score,
            "rank": s.rank
        } for s in scores
    ]

# GET RESPONSES (Audit Log) ---
@router.get("/{quiz_id}/responses")
def get_quiz_responses(quiz_id: int, db: Session = Depends(get_db)):
    """Fetch detailed log of all player responses with Question and User data."""
    # We join both User and Question to provide a readable log
    responses = db.query(models.Response).options(
        joinedload(models.Response.user),
        joinedload(models.Response.question)
    ).filter(
        models.Response.quiz_id == quiz_id
    ).order_by(
        models.Response.created_at.asc()
    ).all()

    return [
        {
            "response_id": r.id,
            "username": r.user.username if r.user else "Unknown",
            "question_text": r.question.question_text if r.question else "Deleted Question",
            "option_id": r.option_id,
            "is_correct": r.is_correct,
            "points_earned": r.points_earned,
            "processing_node_id": r.processing_node_id,
            "timestamp": r.created_at
        } for r in responses
    ]