from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Float, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, index=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"))
    socket_id = Column(String, unique=True, index=True)

    # Relationships
    responses = relationship("Response", back_populates="user", cascade="all, delete-orphan")
    scores = relationship("Score", back_populates="user", cascade="all, delete-orphan")

class Quiz(Base):
    __tablename__ = "quizzes"
    id = Column(Integer, primary_key=True, index=True)
    topic = Column(String)
    quiz_code = Column(String, unique=True, index=True)
    quiz_description = Column(String)
    isLive = Column(Boolean, default=False)
    
    # Cascade ensures deleting a quiz deletes its questions, options, and logs
    questions = relationship("Question", back_populates="quiz", cascade="all, delete-orphan")
    responses = relationship("Response", back_populates="quiz", cascade="all, delete-orphan")
    scores = relationship("Score", back_populates="quiz", cascade="all, delete-orphan")

class Question(Base):
    __tablename__ = "questions"
    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"))
    question_text = Column(String)
    question_number = Column(Integer)
    time_limit_options = Column(Integer)  # Seconds for answering
    time_limit_question = Column(Integer) # Seconds for reading
    
    quiz = relationship("Quiz", back_populates="questions")
    options = relationship("Option", back_populates="question", cascade="all, delete-orphan")
    responses = relationship("Response", back_populates="question", cascade="all, delete-orphan")

class Option(Base):
    __tablename__ = "options"
    id = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, ForeignKey("questions.id"))
    option_text = Column(String)
    is_correct = Column(Boolean, default=False)
    
    question = relationship("Question", back_populates="options")

class Response(Base):
    __tablename__ = "responses"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    quiz_id = Column(Integer, ForeignKey("quizzes.id"))
    question_id = Column(Integer, ForeignKey("questions.id"))
    option_id = Column(Integer, ForeignKey("options.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    is_correct = Column(Boolean)
    points_earned = Column(Float)
    processing_node_id = Column(Integer) # MPI rank that processed this

    user = relationship("User", back_populates="responses")
    quiz = relationship("Quiz", back_populates="responses")
    question = relationship("Question", back_populates="responses")

    # Critical: Prevent a user from answering the same question twice
    __table_args__ = (
        UniqueConstraint('user_id', 'question_id', name='_user_question_uc'),
    )

class Score(Base):
    __tablename__ = "scores"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    quiz_id = Column(Integer, ForeignKey("quizzes.id"))
    total_score = Column(Float, default=0.0)
    rank = Column(Integer, default=0)
    last_updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="scores")
    quiz = relationship("Quiz", back_populates="scores")

class LiveQuiz(Base):
    __tablename__ = "live_quiz"
    quiz_id = Column(Integer, ForeignKey("quizzes.id"), primary_key=True)
    start_timestamp = Column(DateTime, default=datetime.utcnow)
    end_timestamp = Column(DateTime, nullable=True)
    current_question_id = Column(Integer, ForeignKey("questions.id"), nullable=True)

class LiveQuestion(Base):
    """Tracks which question is currently being displayed on player screens"""
    __tablename__ = "live_questions"
    quiz_id = Column(Integer, ForeignKey("quizzes.id"), primary_key=True)
    question_id = Column(Integer, ForeignKey("questions.id"), primary_key=True)
    display_timestamp = Column(DateTime, default=datetime.utcnow)