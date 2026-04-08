import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Users, List, ChevronLeft, Play } from 'lucide-react';
import './LiveMonitor.css';

export default function LiveMonitor({ quiz, goBack }) {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({});
  const [players, setPlayers] = useState([]);
  const [correctOptionId, setCorrectOptionId] = useState(null);
  const wsRef = useRef(null);
  const logsEndRef = useRef(null);

  useEffect(() => {
    // 1. Fetch initial players
    const fetchPlayers = async () => {
      try {
        if (quiz?.id) {
          const res = await fetch(`http://127.0.0.1:8000/api/quiz/${quiz.id}/players`);
          if (res.ok) {
            const data = await res.json();
            setPlayers(data);
          }
        }
      } catch (err) {
        console.error("Failed fetching players:", err);
      }
    };
    fetchPlayers();

    // 2. WebSockets setup
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.hostname}:8000/ws/admin`;
    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'log') {
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setLogs(prev => [...prev, { time: timestamp, msg: data.log }]);
      } else if (data.type === 'chart_update') {
        setStats(data.stats);
        if (data.correct_option_id !== undefined) {
          setCorrectOptionId(data.correct_option_id);
        }
      } else if (data.type === 'players_update') {
        setPlayers(data.players);
      }
    };
    return () => wsRef.current?.close();
  }, [quiz?.id]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleStartQuiz = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN && quiz?.id) {
      wsRef.current.send(JSON.stringify({ action: 'start_quiz', quiz_id: quiz.id }));
    }
  };

  return (
    <div className="admin-wrapper">
      <nav className="admin-nav">
        <button onClick={goBack} className="btn-back-nav">
          <ChevronLeft size={20} /> 
            <span className="hidden sm:inline">Dashboard</span>
        </button>
        
        <div className="flex gap-4 items-center">
          <button onClick={handleStartQuiz} className="btn-start-quiz flex items-center gap-2">
            <Play size={16} fill="white" /> Start Quiz
          </button>
          <div className="text-right border-l pl-4 border-slate-200">
            <h2 className="text-slate-800 font-black text-sm sm:text-lg leading-tight">
                {quiz?.topic || quiz?.title}
            </h2>
            <span className="text-[10px] text-slate-400 font-mono tracking-tighter">
                ID: {quiz?.quiz_code || quiz?.code}
            </span>
          </div>
        </div>
      </nav>

      <div className="admin-grid">
        {/* Left Section: Live Feed */}
        <section className="glass-box feed-container">
          <div className="box-header">
            <List size={18} className="text-indigo-500" />
            <h3>Activity Stream</h3>
          </div>
          <div className="scroll-area custom-scrollbar">
            <AnimatePresence>
              {logs.map((log, i) => (
                <motion.div 
                    initial={{ opacity: 0, x: -10 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    key={i} 
                    className="log-card"
                >
                  <span className="time-tag">{log.time}</span>
                  <p className="text-sm font-medium text-slate-600">{log.msg}</p>
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={logsEndRef} />
          </div>
        </section>

        {/* Right Section: Stats & Players */}
        <div className="stats-column">
          <section className="glass-box players-box">
            <div className="box-header">
              <Users size={18} className="text-indigo-500" />
              <h3>Players ({players.length})</h3>
            </div>
            <div className="player-grid custom-scrollbar">
              {players.map(p => (
                <span key={p.id} className="player-badge shadow-sm">{p.username}</span>
              ))}
            </div>
          </section>

          <section className="glass-box chart-box">
            <div className="box-header">
              <Activity size={18} className="text-indigo-500" />
              <h3>Real-time Responses</h3>
            </div>
            <div className="chart-area">
              {Object.entries(stats).map(([id, count]) => {
                const max = Math.max(...Object.values(stats), 1);
                const isCorrect = String(id) === String(correctOptionId);
                return (
                  <div key={id} className="bar-wrapper">
                    <div className="bar-track">
                      <motion.div 
                        className="bar-fill" 
                        initial={{ height: 0 }}
                        animate={{ height: `${(count/max)*100}%` }}
                        style={{ backgroundColor: isCorrect ? '#22c55e' : '#6366f1' }}
                      >
                        <span className="count-label">{count}</span>
                      </motion.div>
                    </div>
                    <span className="bar-name">Opt {id}</span>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}