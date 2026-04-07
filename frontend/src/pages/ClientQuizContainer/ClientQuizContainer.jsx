import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Clock, CheckCircle2, XCircle, Timer } from 'lucide-react';
import './ClientQuizContainer.css';

export default function ClientQuizContainer() {
  const { quizCode, username } = useParams();
  const [phase, setPhase] = useState(0); 
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState([]);
  const [correctOptionId, setCorrectOptionId] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [message, setMessage] = useState('Quiz will begin shortly...');
  const [selectedOption, setSelectedOption] = useState(null);
  
  const wsRef = useRef(null);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.hostname}:8000/ws/${quizCode}/${username}`;
    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.phase !== undefined) {
        setPhase(data.phase);
        if (data.phase === 1) { setQuestionText(data.text); setSelectedOption(null); }
        else if (data.phase === 2) { setOptions(data.options); }
        else if (data.phase === 3) { setCorrectOptionId(data.correct_option_id); }
        else if (data.phase === 4 || data.phase === 6) { setLeaderboard(data.leaderboard); }
        else if (data.phase === 5) { setMessage(data.message); }
      }
    };
    return () => wsRef.current?.close();
  }, [quizCode, username]);

  const handleOptionClick = (optionId) => {
    if (selectedOption !== null || phase !== 2) return;
    setSelectedOption(optionId);
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        action: 'submit_answer',
        option_id: optionId,
        timestamp: Date.now()
      }));
    }
  };

  const renderPhaseContent = () => {
    switch (phase) {
      case 0: return (
        <motion.div key="p0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="client-box text-center">
          <div className="loader-icon"><Timer className="animate-pulse" size={48} /></div>
          <h2 className="text-2xl font-black text-slate-800">{message}</h2>
          <p className="text-slate-500 mt-2">Get ready, {username}!</p>
        </motion.div>
      );

      case 1: return (
        <motion.div key="p1" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center px-4">
          <span className="phase-badge">Question Reading</span>
          <h1 className="question-display">{questionText}</h1>
        </motion.div>
      );

      case 2: return (
        <div key="p2" className="w-full max-w-5xl">
          <motion.h2 initial={{ y: -20 }} animate={{ y: 0 }} className="question-text-small">{questionText}</motion.h2>
          <div className="options-grid">
            {options.map((opt, i) => {
              const colors = ['opt-red', 'opt-blue', 'opt-green', 'opt-yellow'];
              const isSelected = selectedOption === opt.id;
              return (
                <motion.button 
                  key={opt.id}
                  whileHover={selectedOption === null ? { scale: 1.02, translateY: -5 } : {}}
                  whileTap={selectedOption === null ? { scale: 0.98 } : {}}
                  onClick={() => handleOptionClick(opt.id)}
                  className={`option-btn ${colors[i % 4]} ${selectedOption !== null && !isSelected ? 'opt-dim' : ''} ${isSelected ? 'opt-selected' : ''}`}
                >
                  <span className="opt-index">{String.fromCharCode(65 + i)}</span>
                  <span className="opt-text">{opt.text}</span>
                </motion.button>
              );
            })}
          </div>
        </div>
      );

      case 3: 
        const isCorrect = selectedOption === correctOptionId;
        return (
          <motion.div key="p3" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className={`feedback-card ${isCorrect ? 'is-correct' : 'is-wrong'}`}>
            <div className="feedback-icon">
              {isCorrect ? <CheckCircle2 size={64} /> : <XCircle size={64} />}
            </div>
            <h1>{isCorrect ? 'Brilliant!' : 'Not Quite'}</h1>
            <p>{isCorrect ? 'You nailed that one.' : 'The correct answer was hidden elsewhere.'}</p>
          </motion.div>
        );

      case 4:
      case 6:
        const myRank = leaderboard.find(l => l.username === username);
        return (
          <motion.div key="p4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="client-box leaderboard-card w-full max-w-2xl">
            <div className="card-header-vibrant">
              <Trophy size={32} />
              <h2>{phase === 6 ? "Podium Finish" : "Current Standings"}</h2>
            </div>
            {myRank && <div className="my-rank-banner">You are currently ranked #{myRank.rank}</div>}
            <div className="leader-list">
              {leaderboard.slice(0, 5).map((u, i) => (
                <div key={i} className={`leader-row rank-${u.rank}`}>
                  <span className="rank-num">{u.rank}</span>
                  <span className="rank-name">{u.username}</span>
                  <span className="rank-points">{u.score || 0} pts</span>
                </div>
              ))}
            </div>
          </motion.div>
        );

      default: return <div className="text-white">Connecting to game...</div>;
    }
  };

  return (
    <div className="client-screen">
      <AnimatePresence mode="wait">
        {renderPhaseContent()}
      </AnimatePresence>
    </div>
  );
}