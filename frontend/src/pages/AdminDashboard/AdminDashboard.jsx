import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Radio, ListChecks, ChevronDown, Activity } from 'lucide-react';
import LiveQuiz from './LiveQuiz';
import ExistingQuiz from './ExistingQuiz';
import LiveMonitor from './LiveMonitor'; // This is your original dashboard content
import './AdminDashboard.css';

export default function AdminDashboard() {
  const [view, setView] = useState('hub'); // 'hub' or 'monitor'
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [showLive, setShowLive] = useState(true);
  const [showExisting, setShowExisting] = useState(false);

  // Mock Data - In real app, fetch from your Supabase/Backend
  const liveQuizzes = [
    { id: 101, title: "Final Term Physics", topic: "Quantum Mechanics", players: 42, code: "QX-99" }
  ];

  const handleViewDetails = (quiz) => {
    setActiveQuiz(quiz);
    setView('monitor');
  };

  if (view === 'monitor') {
    return <LiveMonitor quiz={activeQuiz} goBack={() => setView('hub')} />;
  }

  return (
    <div className="admin-hub-wrapper">
      <header className="hub-header">
        <div className="brand">
          <LayoutDashboard className="text-indigo-600" size={32} />
          <h1>Quiz<span>Portal</span></h1>
        </div>
      </header>

      <main className="hub-content">
        {/* LIVE QUIZZES SECTION */}
        <section className="dropdown-section">
          <button className="dropdown-trigger" onClick={() => setShowLive(!showLive)}>
            <div className="flex items-center gap-3">
              <div className={`status-orb ${liveQuizzes.length > 0 ? 'pulse-green' : ''}`} />
              <Radio size={20} />
              <h2>Live Sessions</h2>
            </div>
            <ChevronDown className={`arrow ${showLive ? 'rotate' : ''}`} />
          </button>

          <AnimatePresence>
            {showLive && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="grid-container"
              >
                {liveQuizzes.map(quiz => (
                  <LiveQuiz key={quiz.id} quiz={quiz} onView={() => handleViewDetails(quiz)} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* EXISTING QUIZZES SECTION */}
        <section className="dropdown-section">
          <button className="dropdown-trigger" onClick={() => setShowExisting(!showExisting)}>
            <div className="flex items-center gap-3">
              <ListChecks size={20} />
              <h2>Existing Library</h2>
            </div>
            <ChevronDown className={`arrow ${showExisting ? 'rotate' : ''}`} />
          </button>

          <AnimatePresence>
            {showExisting && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="grid-container"
              >
                <ExistingQuiz />
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </main>
    </div>
  );
}