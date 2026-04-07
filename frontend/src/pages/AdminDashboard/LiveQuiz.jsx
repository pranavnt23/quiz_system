import React from 'react';
import { Users, ExternalLink } from 'lucide-react';
import './LiveQuiz.css';

export default function LiveQuiz({ quiz, onView }) {
  return (
    <div className="live-quiz-card">
      <div className="card-top">
        <span className="quiz-id">#{quiz.code}</span>
        <div className="live-indicator-small">LIVE</div>
      </div>
      <h3>{quiz.title}</h3>
      <p className="topic-text">{quiz.topic}</p>
      
      <div className="card-stats">
        <Users size={16} />
        <span>{quiz.players} Players Participating</span>
      </div>

      <button className="btn-details" onClick={onView}>
        View Live Monitor <ExternalLink size={14} />
      </button>
    </div>
  );
}