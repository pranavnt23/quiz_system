import traceback
from database import SessionLocal
import models

try:
    db = SessionLocal()
    quiz = db.query(models.Quiz).filter_by(id=6).first()
    
    if not quiz:
        print("Quiz 6 not found, creating dummy quiz...")
        quiz = models.Quiz(id=6, topic="Test", quiz_code="12345")
        db.add(quiz)
        db.commit()
        db.refresh(quiz)
        print("Dummy quiz created.")

    print(f"Quiz ID used: {quiz.id}")
    user = models.User(username='test_user', quiz_id=quiz.id, socket_id='unique_test_socket')
    db.add(user)
    db.commit()
    print("User inserted successfully!")
    db.close()
except Exception as e:
    print(traceback.format_exc())
