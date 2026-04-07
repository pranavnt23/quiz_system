import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Users, Zap, Play, List, ShieldCheck } from 'lucide-react';
import './AdminDashboard.css';

export default function AdminDashboard() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({});
  const [players, setPlayers] = useState([]);
  const wsRef = useRef(null);
  const logsEndRef = useRef(null);
  const [quizIdInput, setQuizIdInput] = useState('1');

  useEffect(() => {
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
      } else if (data.type === 'players_update') {
        setPlayers(data.players);
      }
    };
    return () => wsRef.current?.close();
  }, []);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleStartQuiz = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'start_quiz', quiz_id: parseInt(quizIdInput) }));
    }
  };

  return (
    <div className="admin-wrapper">
      {/* TOP NAVIGATION BAR */}
      <nav className="admin-nav">
        <div className="nav-brand">
          <div className="brand-logo"><ShieldCheck size={24} /></div>
          <div className="brand-text">
            <h2>Admin Console</h2>
            <span className="live-indicator"><span className="dot" /> System Active</span>
          </div>
        </div>

        <div className="nav-actions">
          <div className="id-box">
            <label>QUIZ ID</label>
            <input type="number" value={quizIdInput} onChange={e => setQuizIdInput(e.target.value)} />
          </div>
          <button className="btn-launch" onClick={handleStartQuiz}>
            <Play size={18} fill="currentColor" />
            <span>Launch Quiz</span>
          </button>
        </div>
      </nav>

      {/* MAIN CONTENT GRID */}
      <div className="admin-grid">
        
        {/* LEFT: ACTIVITY FEED */}
        <section className="glass-box feed-container">
          <div className="box-header">
            <List size={20} />
            <h3>Activity Stream</h3>
          </div>
          <div className="scroll-area">
            <AnimatePresence>
              {logs.map((log, i) => (
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} key={i} className="log-card">
                  <span className="time-tag">{log.time}</span>
                  <p>{log.msg}</p>
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={logsEndRef} />
          </div>
        </section>

        {/* RIGHT: ANALYTICS & PLAYERS */}
        <div className="stats-column">
          
          <section className="glass-box players-box">
            <div className="box-header">
              <Users size={20} />
              <h3>Players ({players.length})</h3>
            </div>
            <div className="player-grid">
              {players.map(p => (
                <span key={p.id} className="player-badge">{p.username}</span>
              ))}
            </div>
          </section>

          <section className="glass-box chart-box">
            <div className="box-header">
              <Activity size={20} />
              <h3>Live Responses</h3>
            </div>
            <div className="chart-area">
              {Object.entries(stats).map(([id, count]) => {
                const max = Math.max(...Object.values(stats), 1);
                return (
                  <div key={id} className="bar-wrapper">
                    <div className="bar-track">
                      <motion.div className="bar-fill" animate={{ height: `${(count/max)*100}%` }}>
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