import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import JoinQuiz from './pages/JoinQuiz/JoinQuiz';
import ClientQuizContainer from './pages/ClientQuizContainer/ClientQuizContainer';
import AdminDashboard from './pages/AdminDashboard/AdminDashboard';

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
