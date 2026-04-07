import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import JoinQuiz from './pages/JoinQuiz';
import ClientQuizContainer from './pages/ClientQuizContainer';
import AdminDashboard from './pages/AdminDashboard';

function App() {
  return (
    <BrowserRouter>
      <div className="w-full min-h-screen">
        <Routes>
          <Route path="/" element={<JoinQuiz />} />
          <Route path="/quiz/:quizCode/:username" element={<ClientQuizContainer />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
