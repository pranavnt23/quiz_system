import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Hash, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  HelpCircle,
  Calendar,
  Layers,
  ChevronRight,
  Loader2
} from 'lucide-react';
import './ViewQuiz.css';

export default function ViewQuiz() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchQuizDetails = async () => {
      try {
        const response = await fetch(`http://127.0.0.1:8000/api/quiz/${id}`);
        if (!response.ok) throw new Error('Failed to fetch quiz details');
        const data = await response.json();
        setQuiz(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchQuizDetails();
  }, [id]);

  if (loading) {
    return (
      <div className="view-quiz-loading">
        <Loader2 className="animate-spin text-indigo-500" size={48} />
        <p>Loading quiz blueprint...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="view-quiz-error">
        <XCircle className="text-red-500 mb-4" size={64} />
        <h2>Connection Error</h2>
        <p>{error}</p>
        <button onClick={() => navigate('/admin')} className="btn-back">
          <ArrowLeft size={18} /> Return to Safety
        </button>
      </div>
    );
  }

  return (
    <div className="view-quiz-container">
      {/* Background elements for aesthetic */}
      <div className="bg-blob-1"></div>
      <div className="bg-blob-2"></div>

      <header className="view-quiz-header">
        <button onClick={() => navigate('/admin')} className="icon-back-btn" title="Back to Dashboard">
          <ArrowLeft size={24} />
        </button>
        <div className="header-info">
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            {quiz.topic}
          </motion.h1>
          <div className="header-meta">
            <span className="badge-code">
              <Hash size={14} /> {quiz.quiz_code}
            </span>
            <span className="badge-count">
              <Layers size={14} /> {quiz.questions?.length || 0} Questions
            </span>
          </div>
        </div>
      </header>

      <main className="view-quiz-content">
        <motion.section 
          className="quiz-summary-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h3>Overview</h3>
          <p>{quiz.quiz_description || "No description provided for this quiz."}</p>
          <div className="summary-footer">
             <div className="summary-stat">
                <Calendar size={16} />
                <span>Created recently</span>
             </div>
          </div>
        </motion.section>

        <div className="questions-section">
          <h2>Questions Breakdown</h2>
          <div className="questions-list">
            {quiz.questions?.map((q, idx) => (
              <motion.div 
                key={q.id}
                className="question-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <div className="q-card-header">
                  <span className="q-number">#{idx + 1}</span>
                  <div className="q-timings">
                    <span title="Reading Time">
                      <Clock size={14} className="text-amber-500" /> {q.time_limit_question}s
                    </span>
                    <span title="Answering Time">
                      <Clock size={14} className="text-indigo-500" /> {q.time_limit_options}s
                    </span>
                  </div>
                </div>

                <p className="q-text">{q.text}</p>

                <div className="options-grid">
                  {q.options?.map((opt) => (
                    <div 
                      key={opt.id} 
                      className={`option-pill ${opt.is_correct ? 'correct' : 'incorrect'}`}
                    >
                      {opt.is_correct ? <CheckCircle2 size={14} /> : <ChevronRight size={14} />}
                      <span>{opt.text}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
