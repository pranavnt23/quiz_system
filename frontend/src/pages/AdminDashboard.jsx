import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

export default function AdminDashboard() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({});
  const [players, setPlayers] = useState([]);
  const wsRef = useRef(null);
  const logsEndRef = useRef(null);
  
  // Just for POC testing
  const [quizIdInput, setQuizIdInput] = useState('1'); 

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.hostname}:8000/ws/admin`;
    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'log') {
        const timestamp = new Date().toLocaleTimeString();
        setLogs(prev => [...prev, `[${timestamp}] ${data.log}`]);
      } else if (data.type === 'chart_update') {
        setStats(data.stats);
      } else if (data.type === 'players_update') {
        setPlayers(data.players);
      }
    };

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleStartQuiz = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        action: 'start_quiz',
        quiz_id: parseInt(quizIdInput)
      }));
    }
  };

  return (
    <div className="flex h-screen bg-gray-900 text-white p-4 space-x-4">
      {/* LEFT PANEL: LOGS map directly to backend worker logs */}
      <div className="w-1/2 bg-gray-800 rounded-xl flex flex-col overflow-hidden border border-gray-700 shadow-2xl">
        <div className="p-4 bg-gray-900 border-b border-gray-700 flex justify-between items-center z-10 shadow-md">
          <h2 className="text-xl font-bold font-mono text-green-400">Server Logs & Workers</h2>
          <div className="flex space-x-2">
            <input 
              type="number" 
              className="bg-gray-700 text-white px-2 py-1 rounded w-16"
              value={quizIdInput}
              onChange={e => setQuizIdInput(e.target.value)}
              placeholder="Quiz ID"
            />
            <button 
              onClick={handleStartQuiz}
              className="bg-green-600 hover:bg-green-500 px-4 py-1 rounded text-sm font-bold shadow-lg"
            >
              Start Quiz
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 font-mono text-sm space-y-2">
          {logs.length === 0 && <span className="text-gray-500">Waiting for activity...</span>}
          {logs.map((log, i) => (
            <div key={i} className="text-green-300">
               {log.includes('Worker') ? (
                  <span className="text-blue-400 font-bold">{log}</span>
               ) : (
                  <span>{log}</span>
               )}
            </div>
          ))}
          <div ref={logsEndRef} />
        </div>
      </div>

      {/* RIGHT PANEL: LIVE VISUALIZATION */}
      <div className="w-1/2 flex flex-col space-y-4">
        {/* PLAYERS LIST (TOP HALF) */}
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 h-1/3 overflow-y-auto shadow-2xl">
           <h2 className="text-xl font-bold mb-4 text-purple-400">Connected Players ({players.length})</h2>
           <div className="flex flex-wrap gap-2">
              {players.map(p => (
                 <span key={p.id} className="bg-purple-900/50 text-purple-200 border border-purple-700 px-3 py-1 rounded-full text-sm">
                    {p.username}
                 </span>
              ))}
           </div>
        </div>
        
        {/* CHART (BOTTOM HALF) */}
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 flex-1 relative flex flex-col shadow-2xl">
          <h2 className="text-xl font-bold mb-4 text-yellow-400">Live Vote Chart</h2>
          <div className="flex-1 flex items-end justify-around pb-4">
             {/* If stats object is empty, show empty state */}
             {Object.keys(stats).length === 0 && (
                <div className="text-gray-500 my-auto text-lg block w-full text-center pb-20">Waiting for answers...</div>
             )}
             
             {/* Simple Bar Chart mapping Option IDs to Vote Count */}
             {Object.entries(stats).map(([optionId, count]) => {
                const heightPercentage = Math.min((count / Math.max(Object.keys(stats).length, 1)) * 100, 100);
                return (
                   <div key={optionId} className="flex flex-col items-center w-1/5">
                      <motion.div 
                        initial={{ height: 0 }}
                        animate={{ height: `${heightPercentage}%` }}
                        className="w-full bg-white rounded-t-lg relative flex justify-center items-end pb-2 group"
                        // In real setup, we would highlight the correct one green from backend msg.
                      >
                         <span className="font-bold text-gray-900 group-hover:-translate-y-6 transition-transform opacity-0 group-hover:opacity-100 absolute drop-shadow-md bg-white px-2 py-1 rounded">
                           {count} Votes
                         </span>
                      </motion.div>
                      <div className="mt-2 text-sm font-bold text-gray-400 truncate w-full text-center">
                         Opt {optionId}
                      </div>
                   </div>
                );
             })}
          </div>
        </div>
      </div>
    </div>
  );
}
