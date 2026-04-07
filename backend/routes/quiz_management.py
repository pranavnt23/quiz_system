from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
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
