import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export default function ClientQuizContainer() {
  const { quizCode, username } = useParams();
  const [phase, setPhase] = useState(0); // 0 = waiting
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState([]);
  const [feedbackMap, setFeedbackMap] = useState({});
  const [correctOptionId, setCorrectOptionId] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [message, setMessage] = useState('Quiz will begin shortly...');
  
  const [selectedOption, setSelectedOption] = useState(null);
  
  const wsRef = useRef(null);
  const myUserIdRef = useRef(null); // Assuming Server gives us this, wait, server matches by socket, so mapped dict

  useEffect(() => {
    // Construct WS URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.hostname}:8000/ws/${quizCode}/${username}`;
    
    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.phase !== undefined) {
        setPhase(data.phase);
        
        if (data.phase === 1) {
          setQuestionText(data.text);
          setSelectedOption(null);
        } else if (data.phase === 2) {
          setOptions(data.options);
        } else if (data.phase === 3) {
          setFeedbackMap(data.feedback);
          setCorrectOptionId(data.correct_option_id);
        } else if (data.phase === 4 || data.phase === 6) {
          setLeaderboard(data.leaderboard);
        } else if (data.phase === 5) {
          setMessage(data.message);
        }
      } else if (data.type === 'your_id') {
         myUserIdRef.current = data.user_id;
      }
    };

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, [quizCode, username]);

  const handleOptionClick = (optionId) => {
    if (selectedOption) return; // Prevent multiple clicks
    setSelectedOption(optionId);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        action: 'submit_answer',
        option_id: optionId,
        timestamp: Date.now()
      }));
    }
  };

  const renderPhaseContent = () => {
    switch (phase) {
      case 0: // Waiting
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
            <h2 className="text-3xl font-bold mb-4">{message}</h2>
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mx-auto"></div>
          </motion.div>
        );
      case 1: // Reading Time
        return (
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold !leading-tight">{questionText}</h1>
          </motion.div>
        );
      case 2: // Answering Time
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-4xl mx-auto flex flex-col items-center">
             <h2 className="text-2xl font-semibold mb-8 text-center">{questionText}</h2>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
               {options.map((opt, i) => {
                 const colors = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500'];
                 const baseColor = colors[i % colors.length];
                 const isSelected = selectedOption === opt.id;
                 const opacity = selectedOption ? (isSelected ? 'opacity-100' : 'opacity-50') : 'opacity-100 hover:scale-[1.02] cursor-pointer';

                 return (
                   <motion.div 
                     key={opt.id}
                     whileTap={selectedOption ? {} : { scale: 0.95 }}
                     onClick={() => handleOptionClick(opt.id)}
                     className={`${baseColor} ${opacity} text-white font-bold text-xl md:text-2xl p-8 rounded-xl shadow-lg flex items-center justify-center transition-all min-h-[120px]`}
                   >
                     {opt.text}
                   </motion.div>
                 );
               })}
             </div>
          </motion.div>
        );
      case 3: // Result Feedback (Green/Red)
        // Strictly showing correct/wrong if we submitted, else just correct answer
        const isCorrect = selectedOption === correctOptionId;
        const color = selectedOption ? (isCorrect ? 'bg-green-500' : 'bg-red-500') : 'bg-gray-500';
        const resultMsg = selectedOption ? (isCorrect ? 'Correct!' : 'Incorrect') : 'Time is up!';
        return (
           <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} className={`w-full max-w-md mx-auto rounded-3xl p-12 text-center text-white ${color}`}>
              <h1 className="text-5xl font-bold mb-4">{resultMsg}</h1>
              <p className="text-xl">
                 {isCorrect ? 'Awesome job!' : 'Better luck next time.'}
              </p>
           </motion.div>
        );
      case 4: // Leaderboard
      case 6: // Final Leaderboard
        const myRankEntry = leaderboard.find(l => l.username === username);
        return (
           <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-2xl mx-auto glass rounded-3xl p-8">
              <h2 className="text-3xl font-bold text-center mb-6 text-yellow-400">
                 {phase === 6 ? "Final Podium" : "Leaderboard"}
              </h2>
              {myRankEntry && (
                <div className="bg-white/20 rounded-xl p-4 mb-6 text-center text-xl font-semibold border border-white/30">
                  You are {myRankEntry.rank}{[1, 21, 31].includes(myRankEntry.rank) ? 'st' : [2, 22].includes(myRankEntry.rank) ? 'nd' : [3, 23].includes(myRankEntry.rank) ? 'rd' : 'th'}!
                </div>
              )}
              <div className="space-y-3">
                 {leaderboard.slice(0, 10).map((u, i) => (
                    <div key={i} className="flex justify-between items-center bg-black/20 p-4 rounded-lg">
                       <span className="font-bold text-lg">{u.rank}. {u.username}</span>
                    </div>
                 ))}
              </div>
           </motion.div>
        );
      case 5: // Transition
        return (
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
            <h2 className="text-4xl font-bold">{message}</h2>
          </motion.div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 w-full">
      <AnimatePresence mode="wait">
        {renderPhaseContent()}
      </AnimatePresence>
    </div>
  );
}
