import React from 'react';
import { Edit3, Trash2, Rocket, Hash } from 'lucide-react';
import './ExistingQuiz.css';

export default function ExistingQuiz() {
  // Mock List
  const quizzes = [
    { title: "General Trivia", code: "GEN101", desc: "Basic general knowledge questions for all ages." }
  ];

  return (
    <>
      {quizzes.map((q, i) => (
        <div key={i} className="existing-quiz-card">
          <div className="card-header-row">
            <div className="code-badge"><Hash size={12}/> {q.code}</div>
            <div className="actions-row">
              <button className="icon-btn edit"><Edit3 size={16}/></button>
              <button className="icon-btn delete"><Trash2 size={16}/></button>
            </div>
          </div>
          <h3>{q.title}</h3>
          <p>{q.desc}</p>
          <button className="btn-launch-main">
            <Rocket size={16} /> Launch Session
          </button>
        </div>
      ))}
    </>
  );
}