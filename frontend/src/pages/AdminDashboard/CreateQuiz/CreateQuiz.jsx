import React, { useState } from 'react';
import { ChevronLeft, Save, PlusCircle, Trash2, Clock, Loader2 } from 'lucide-react';
import './CreateQuiz.css';

export default function CreateQuiz({ goBack }) {
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  // --- ADD QUESTION LOGIC ---
  const addQuestion = () => {
    const newQuestion = {
      id: Date.now(),
      question_text: '',
      time_limit_options: 10,
      time_limit_question: 30,
      options: [
        { option_text: '', is_correct: false },
        { option_text: '', is_correct: false },
        { option_text: '', is_correct: false },
        { option_text: '', is_correct: false }
      ]
    };
    setQuestions([...questions, newQuestion]);
  };

  // --- API CALL LOGIC ---
  const handleSave = async () => {
    if (!topic || questions.length === 0) {
      alert("Please enter a topic and at least one question.");
      return;
    }

    setIsSaving(true);

    // Format data to match your Backend Pydantic Model
    const payload = {
      topic: topic,
      quiz_description: description,
      questions: questions.map((q, idx) => ({
        question_text: q.question_text,
        question_number: idx + 1,
        time_limit_options: parseInt(q.time_limit_options),
        time_limit_question: parseInt(q.time_limit_question),
        options: q.options.map(opt => ({
          option_text: opt.option_text,
          is_correct: opt.is_correct
        }))
      }))
    };

    try {
      const response = await fetch('http://127.0.0.1:8000/api/quiz/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Quiz Created Successfully! Code: ${result.quiz_code}`);
        goBack(); // Redirect back to Hub
      } else {
        const errorData = await response.json();
        alert(`Error: ${JSON.stringify(errorData.detail)}`);
      }
    } catch (error) {
      console.error("API Error:", error);
      alert("Failed to connect to the backend server.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="admin-hub-wrapper">
      <header className="hub-header">

        <div className="brand">
          <h1>New<span>Quiz</span></h1>
        </div>
        <button 
          className="btn-save" 
          onClick={handleSave} 
          disabled={isSaving}
        >
          {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
          {isSaving ? "Saving..." : "Save Quiz"}
        </button>
      </header>

      <main className="create-area">
        {/* TOPIC & DESCRIPTION */}
        <div className="glass-box creation-card">
          <div className="input-field">
            <label>Quiz Topic</label>
            <input 
              type="text" 
              placeholder="e.g. Physics Basics" 
              value={topic} 
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>
          <div className="input-field">
            <label>Description</label>
            <textarea 
              placeholder="Enter quiz details..." 
              value={description} 
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        {/* QUESTIONS RENDER */}
        <div className="questions-stack">
          {questions.map((q, qIdx) => (
            <div key={q.id} className="glass-box question-card-item">
              <div className="q-card-header">
                <span className="q-number">Question {qIdx + 1}</span>
                <button 
                  className="btn-remove" 
                  onClick={() => setQuestions(questions.filter(item => item.id !== q.id))}
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <input 
                type="text" 
                className="q-input-main" 
                placeholder="What is the question?" 
                value={q.question_text}
                onChange={(e) => {
                  const updated = [...questions];
                  updated[qIdx].question_text = e.target.value;
                  setQuestions(updated);
                }}
              />

              {/* TIMING CONFIGURATION */}
              <div className="timing-config-row">
                <div className="timing-input-group">
                  <div className="timing-label">
                    <Clock size={14} className="text-amber-500" />
                    <span>Reading Time (sec)</span>
                  </div>
                  <input 
                    type="number" 
                    min="1"
                    max="60"
                    value={q.time_limit_question}
                    onChange={(e) => {
                      const updated = [...questions];
                      updated[qIdx].time_limit_question = e.target.value;
                      setQuestions(updated);
                    }}
                  />
                </div>
                <div className="timing-input-group">
                  <div className="timing-label">
                    <Clock size={14} className="text-indigo-500" />
                    <span>Answering Time (sec)</span>
                  </div>
                  <input 
                    type="number" 
                    min="5"
                    max="120"
                    value={q.time_limit_options}
                    onChange={(e) => {
                      const updated = [...questions];
                      updated[qIdx].time_limit_options = e.target.value;
                      setQuestions(updated);
                    }}
                  />
                </div>
              </div>

              {/* OPTIONS INPUTS */}
              <div className="options-input-grid">
                {q.options.map((opt, oIdx) => (
                  <div key={oIdx} className={`opt-input-row ${opt.is_correct ? 'is-correct-border' : ''}`}>
                    <input 
                      type="text" 
                      placeholder={`Option ${oIdx + 1}`}
                      value={opt.option_text}
                      onChange={(e) => {
                        const updated = [...questions];
                        updated[qIdx].options[oIdx].option_text = e.target.value;
                        setQuestions(updated);
                      }}
                    />
                    <input 
                      type="checkbox" 
                      checked={opt.is_correct}
                      onChange={(e) => {
                        const updated = [...questions];
                        // Ensure only one correct answer if needed, or allow multiple
                        updated[qIdx].options[oIdx].is_correct = e.target.checked;
                        setQuestions(updated);
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button className="add-q-btn" onClick={addQuestion}>
          <PlusCircle size={20} /> Add a Question
        </button>
      </main>
    </div>
  );
}