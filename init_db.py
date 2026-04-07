import sys
import os

# Add backend directory to sys.path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from database import engine, get_db, Base
from models import Quiz, Question, Option
import models

# Recreate tables (warning: drops all data)
Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

db = next(get_db())

q1 = Quiz(topic="General Knowledge parallel", quiz_code="123456", quiz_description="Test your knowledge!")
db.add(q1)
db.commit()
db.refresh(q1)

quest1 = Question(quiz_id=q1.id, question_text="What is the capital of France?", question_number=1, time_limit_options=10, time_limit_question=3)
quest2 = Question(quiz_id=q1.id, question_text="What is 2 + 2?", question_number=2, time_limit_options=10, time_limit_question=3)
db.add_all([quest1, quest2])
db.commit()
db.refresh(quest1)
db.refresh(quest2)

opt1 = Option(question_id=quest1.id, option_text="Berlin", is_correct=False)
opt2 = Option(question_id=quest1.id, option_text="Paris", is_correct=True)
opt3 = Option(question_id=quest1.id, option_text="London", is_correct=False)
opt4 = Option(question_id=quest1.id, option_text="Rome", is_correct=False)
db.add_all([opt1, opt2, opt3, opt4])

opt5 = Option(question_id=quest2.id, option_text="3", is_correct=False)
opt6 = Option(question_id=quest2.id, option_text="4", is_correct=True)
opt7 = Option(question_id=quest2.id, option_text="5", is_correct=False)
opt8 = Option(question_id=quest2.id, option_text="22", is_correct=False)
db.add_all([opt5, opt6, opt7, opt8])

db.commit()
print("Database initialized with sample test Quiz (Code: 123456) (ID: 1).")
