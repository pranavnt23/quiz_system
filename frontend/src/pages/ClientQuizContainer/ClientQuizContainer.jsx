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
  const [timeLeft, setTimeLeft] = useState(0);
  const [isCorrectFB, setIsCorrectFB] = useState(false);
  
  const wsRef = useRef(null);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.hostname}:8000/ws/${quizCode}/${username}`;
    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.phase !== undefined) {
        setPhase(data.phase);
        setTimeLeft(data.duration || 0);
        
        if (data.phase === 1) { 
          setQuestionText(data.text); 
          setSelectedOptions([]); // Reset selections for new question
          setCorrectOptionId(null); 
        }
        else if (data.phase === 2) { setOptions(data.options); }
        else if (data.phase === 3) { 
            setCorrectOptionId(data.correct_option_id); 
            if (data.feedback) setIsCorrectFB(data.feedback[username] || false);
        }
        else if (data.phase === 4 || data.phase === 6) { setLeaderboard(data.leaderboard); }
        else if (data.phase === 5) { setMessage(data.message); }
      } else if (data.type === 'players_update') {
        setPlayers(data.players);
      }
    };
    return () => wsRef.current?.close();
  }, [quizCode, username]);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const interval = setInterval(() => setTimeLeft(prev => prev > 0 ? prev - 1 : 0), 1000);
    return () => clearInterval(interval);
  }, [timeLeft]);

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
        return (
          <motion.div key="p3" className={`fullscreen-feedback ${isCorrectFB ? 'correct' : 'wrong'}`}>
             <div className="feedback-inner">
               {isCorrectFB ? <CheckCircle2 size={100} /> : <XCircle size={100} />}
               <h1>{isCorrectFB ? 'POINT SECURED!' : 'MISSED IT!'}</h1>
             </div>
          </motion.div>
        );

      case 4:
      case 6:
        // Calculate the maximum score to define 100% width on the bar graph
        const maxScore = Math.max(...leaderboard.map(u => u.score), 1000); 

        return (
          <motion.div 
            key="p4" 
            initial={{scale: 0.8, opacity: 0}} 
            animate={{scale: 1, opacity: 1}} 
            className="client-box leaderboard-container-enhanced"
          >
            <div className="leader-header-enhanced">
              <Trophy size={42} fill="currentColor" className="trophy-icon" /> 
              <h2>Top Performers</h2>
            </div>
            
            <div className="leader-list leaderboard-graph">
              {leaderboard.map((u, i) => {
                const isMe = u.username === username;
                let rankClass = "rank-standard";
                let medal = null;
                
                if (u.rank === 1) { rankClass = "rank-gold"; medal = "🥇"; }
                else if (u.rank === 2) { rankClass = "rank-silver"; medal = "🥈"; }
                else if (u.rank === 3) { rankClass = "rank-bronze"; medal = "🥉"; }

                const barWidth = Math.max((u.score / maxScore) * 100, 5) + "%";

                return (
                  <motion.div 
                    initial={{x: -30, opacity: 0}}
                    animate={{x: 0, opacity: 1}}
                    transition={{delay: i * 0.1, type: "spring"}}
                    key={i} 
                    className={`leader-row-enhanced ${rankClass} ${isMe ? 'is-me-highlight' : ''}`}
                  >
                    <div className="leader-bar" style={{ width: barWidth }} />
                    <div className="leader-content">
                      <div className="flex-row" style={{ zIndex: 2 }}>
                        <div className="rank-badge">{medal || `#${u.rank}`}</div>
                        <span className="leader-name">{u.username} {isMe && <span className="you-badge">You</span>}</span>
                      </div>
                      <span className="leader-score" style={{ zIndex: 2 }}>
                        {u.score} <span className="pts-label">pts</span>
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
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
      
      {(phase === 1 || phase === 2) && (
        <div className="timer-top-right">
          <Timer size={24} />
          <span>{timeLeft}s</span>
        </div>
      )}

      <AnimatePresence mode="wait">
        {renderPhaseContent()}
      </AnimatePresence>
    </div>
  );
}