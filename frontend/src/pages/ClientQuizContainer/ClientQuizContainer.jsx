import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, CheckCircle2, XCircle, Timer, Users } from 'lucide-react';
import './ClientQuizContainer.css';

export default function ClientQuizContainer() {
  const { quizCode, username } = useParams();
  const [phase, setPhase] = useState(0); 
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState([]);
  const [correctOptionId, setCorrectOptionId] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [message, setMessage] = useState('Waiting for host...');
  
  // Changed to Array for multiple selections
  const [selectedOptions, setSelectedOptions] = useState([]); 
  const [players, setPlayers] = useState([]);
  
  const wsRef = useRef(null);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.hostname}:8000/ws/${quizCode}/${username}`;
    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.phase !== undefined) {
        setPhase(data.phase);
        if (data.phase === 1) { 
          setQuestionText(data.text); 
          setSelectedOptions([]); // Reset selections for new question
          setCorrectOptionId(null); 
        }
        else if (data.phase === 2) { setOptions(data.options); }
        else if (data.phase === 3) { setCorrectOptionId(data.correct_option_id); }
        else if (data.phase === 4 || data.phase === 6) { setLeaderboard(data.leaderboard); }
        else if (data.phase === 5) { setMessage(data.message); }
      } else if (data.type === 'players_update') {
        setPlayers(data.players);
      }
    };
    return () => wsRef.current?.close();
  }, [quizCode, username]);

  // Toggle Logic: Select if not present, Deselect if present
  const handleOptionToggle = (optionId) => {
    if (phase !== 2) return;

    let updatedSelections;
    if (selectedOptions.includes(optionId)) {
      updatedSelections = selectedOptions.filter(id => id !== optionId);
    } else {
      updatedSelections = [...selectedOptions, optionId];
    }

    setSelectedOptions(updatedSelections);

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        action: 'submit_answer',
        option_ids: updatedSelections, // Sending array to backend
        timestamp: Date.now() / 1000
      }));
    }
  };

  const renderPhaseContent = () => {
    switch (phase) {
      case 0: return (
        <motion.div key="p0" className="client-box text-center lobby-card">
          <div className="lobby-header">
            <Users size={24} className="text-indigo-600" />
            <span>{players.length} Players Joined</span>
          </div>
          <h2>{message}</h2>
          <p>Get ready, <span className="highlight-user">{username}</span>!</p>
        </motion.div>
      );

      case 1: return (
        <motion.div key="p1" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <div className="reading-label"><Timer size={18} /> Reading Phase</div>
          <h1 className="question-display">{questionText}</h1>
        </motion.div>
      );

      case 2: return (
        <div key="p2" className="quiz-active-area">
          <h2 className="question-heading">{questionText}</h2>
          <div className="options-stack">
            {options.map((opt, i) => {
              const symbols = ["▲", "◆", "●", "■"];
              const isSelected = selectedOptions.includes(opt.id);
              return (
                <motion.button 
                  key={opt.id}
                  layout
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleOptionToggle(opt.id)}
                  className={`option-card color-${i} ${isSelected ? 'is-selected' : ''}`}
                >
                  <div className="option-content">
                    <span className="symbol-box">{symbols[i]}</span>
                    <span className="text-box">{opt.text}</span>
                  </div>
                  {isSelected && <motion.div layoutId="check" className="check-indicator"><CheckCircle2 size={20} /></motion.div>}
                </motion.button>
              );
            })}
          </div>
        </div>
      );

      case 3: 
        // Logic for multiple: correct if all selected IDs are right
        const isCorrect = selectedOptions.includes(correctOptionId); 
        return (
          <motion.div key="p3" className={`fullscreen-feedback ${isCorrect ? 'correct' : 'wrong'}`}>
             <div className="feedback-inner">
               {isCorrect ? <CheckCircle2 size={100} /> : <XCircle size={100} />}
               <h1>{isCorrect ? 'POINT SECURED!' : 'MISSED IT!'}</h1>
             </div>
          </motion.div>
        );

      case 4:
      case 6:
        return (
          <motion.div key="p4" className="client-box leaderboard-container">
            <div className="leader-header"><Trophy className="text-yellow-500" /> Leaderboard</div>
            {leaderboard.map((u, i) => (
              <div key={i} className={`leader-row ${u.username === username ? 'me' : ''}`}>
                <span className="rank">#{u.rank}</span>
                <span className="name">{u.username}</span>
                <span className="score">{u.score} pts</span>
              </div>
            ))}
          </motion.div>
        );

      default: return <div className="loader">Connecting...</div>;
    }
  };

  return (
    <div className="client-screen">
      <div className="aurora-bg">
        <div className="blob one"></div>
        <div className="blob two"></div>
      </div>
      <AnimatePresence mode="wait">
        {renderPhaseContent()}
      </AnimatePresence>
    </div>
  );
}