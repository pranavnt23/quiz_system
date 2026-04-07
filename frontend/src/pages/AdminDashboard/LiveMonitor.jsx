import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Users, List, ShieldCheck, ChevronLeft } from 'lucide-react';

export default function LiveMonitor({ quiz, goBack }) {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({});
  const [players, setPlayers] = useState([]);
  const wsRef = useRef(null);
  const logsEndRef = useRef(null);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Using the quiz code from the clicked quiz
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

  return (
    <div className="admin-wrapper">
      <nav className="admin-nav">
        <button onClick={goBack} className="flex items-center gap-2 text-indigo-600 font-bold hover:underline">
          <ChevronLeft size={20} /> Back to Hub
        </button>
        <div className="text-right">
          <h2 className="text-slate-800 font-black">{quiz?.title}</h2>
          <span className="text-xs text-slate-500 font-mono">Monitoring: {quiz?.code}</span>
        </div>
      </nav>

      <div className="admin-grid">
        <section className="glass-box feed-container">
          <div className="box-header">
            <List size={20} />
            <h3>Activity Stream</h3>
          </div>
          <div className="scroll-area custom-scrollbar">
            <AnimatePresence>
              {logs.map((log, i) => (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={i} className="log-card">
                  <span className="time-tag">{log.time}</span>
                  <p>{log.msg}</p>
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={logsEndRef} />
          </div>
        </section>

        <div className="stats-column">
          <section className="glass-box players-box">
            <div className="box-header">
              <Users size={20} />
              <h3>Live Players ({players.length})</h3>
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
              <h3>Real-time Responses</h3>
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