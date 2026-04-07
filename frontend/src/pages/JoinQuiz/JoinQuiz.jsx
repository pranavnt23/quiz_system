import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, User, Hash, Rocket } from 'lucide-react';
import './JoinQuiz.css';

export default function JoinQuiz() {
  const [quizCode, setQuizCode] = useState('');
  const [username, setUsername] = useState('');
  const navigate = useNavigate();

  const handleJoin = (e) => {
    e.preventDefault();
    if (quizCode && username) {
      navigate(`/quiz/${quizCode}/${username}`);
    }
  };

  return (
    <div className="join-container">
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="glass-box join-card"
      >
        {/* Header Section */}
        <div className="join-header">
          <div className="icon-badge">
            <Rocket size={32} />
          </div>
          <h1>Quiz<span>Master</span></h1>
          <p>The arena is waiting. Enter your credentials.</p>
        </div>

        {/* Form Section */}
        <form onSubmit={handleJoin} className="join-form">
          <div className="input-wrapper">
            <div className="input-icon"><Hash size={20} /></div>
            <input
              type="text"
              placeholder="GAME PIN"
              value={quizCode}
              onChange={(e) => setQuizCode(e.target.value.toUpperCase())}
              className="attractive-input pin-input"
              required
            />
          </div>

          <div className="input-wrapper">
            <div className="input-icon"><User size={20} /></div>
            <input
              type="text"
              placeholder="NICKNAME"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="attractive-input"
              required
            />
          </div>

          <motion.button
            whileHover={{ scale: 1.02, translateY: -2 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            className="btn-primary"
          >
            <span>JOIN GAME</span>
            <Play size={20} fill="currentColor" />
          </motion.button>
        </form>

        <div className="join-footer">
          <span className="secure-tag">Secure Connection Established</span>
        </div>
      </motion.div>
    </div>
  );
}