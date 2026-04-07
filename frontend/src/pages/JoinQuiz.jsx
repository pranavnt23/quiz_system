import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play } from 'lucide-react';

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
    <div className="flex items-center justify-center min-h-screen p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="glass rounded-3xl p-8 w-full max-w-md"
      >
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-blue-500 mb-2">
            Quiz Master
          </h1>
          <p className="text-gray-300">Enter pin to join the game</p>
        </div>

        <form onSubmit={handleJoin} className="space-y-6">
          <div>
            <input
              type="text"
              placeholder="Game PIN"
              value={quizCode}
              onChange={(e) => setQuizCode(e.target.value.toUpperCase())}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-xl font-bold tracking-widest transition-all"
              required
            />
          </div>
          <div>
            <input
              type="text"
              placeholder="Nickname"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-lg transition-all"
              required
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="submit"
            className="w-full bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-500 hover:to-teal-400 text-white rounded-xl py-3 font-semibold text-lg flex items-center justify-center space-x-2 shadow-lg shadow-blue-500/30"
          >
            <span>Join Game</span>
            <Play size={20} />
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}
