import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit3, Trash2, Rocket, Hash, Loader2, Eye } from 'lucide-react';
import './ExistingQuiz.css';

export default function ExistingQuiz({ onLaunch }) {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // 1. Fetch all quizzes from backend
  const fetchQuizzes = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/quiz/list');
      if (!response.ok) throw new Error('Failed to fetch quizzes');
      const data = await response.json();
      setQuizzes(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuizzes();
  }, []);

  // 2. Handle Delete API Call
  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this quiz and all its questions?")) {
      try {
        const response = await fetch(`http://127.0.0.1:8000/api/quiz/${id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          // Remove from local state so it disappears from UI immediately
          setQuizzes((prev) => prev.filter((quiz) => quiz.id !== id));
          alert("Quiz deleted successfully");
        } else {
          const errorData = await response.json();
          alert(`Error: ${errorData.detail || "Could not delete quiz"}`);
        }
      } catch (err) {
        console.error("Delete error:", err);
        alert("Failed to reach the server.");
      }
    }
  };

  const handleView = (id) => {
    navigate(`/admin/view-quiz/${id}`);
  };

  if (loading) return (
    <div className="flex flex-col items-center p-10 text-slate-500">
      <Loader2 className="animate-spin mb-2" />
      <p>Loading library...</p>
    </div>
  );

  if (error) return (
    <div className="text-red-500 p-10 text-center">
      <p className="font-bold">Error connecting to backend</p>
      <p className="text-sm">{error}</p>
      <button 
        onClick={() => {setLoading(true); fetchQuizzes();}}
        className="mt-4 text-xs bg-slate-200 px-3 py-1 rounded hover:bg-slate-300"
      >
        Retry
      </button>
    </div>
  );

  return (
    <>
      {quizzes.length === 0 ? (
        <div className="text-slate-400 text-center p-10 bg-white/20 rounded-2xl border border-dashed border-white/40">
          <p>Your library is empty.</p>
        </div>
      ) : (
        quizzes.map((q) => (
          <div key={q.id} className="existing-quiz-card">
            <div className="card-header-row">
              <div className="code-badge">
                <Hash size={12}/> {q.quiz_code}
              </div>
              <div className="actions-row">
                <button 
                  className="icon-btn view" 
                  title="View Details"
                  onClick={() => handleView(q.id)}
                >
                  <Eye size={16}/>
                </button>
                <button className="icon-btn edit" title="Edit">
                  <Edit3 size={16}/>
                </button>
                <button 
                  className="icon-btn delete" 
                  title="Delete"
                  onClick={() => handleDelete(q.id)}
                >
                  <Trash2 size={16}/>
                </button>
              </div>
            </div>
            
            <h3>{q.topic}</h3>
            <p className="quiz-desc">{q.quiz_description}</p>
            
            <button className="btn-launch-main" onClick={() => onLaunch && onLaunch(q)}>
              <Rocket size={16} /> Launch Session
            </button>
          </div>
        ))
      )}
    </>
  );
}