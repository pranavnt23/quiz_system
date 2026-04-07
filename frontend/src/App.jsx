import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import JoinQuiz from './pages/JoinQuiz/JoinQuiz';
import ClientQuizContainer from './pages/ClientQuizContainer/ClientQuizContainer';
import AdminDashboard from './pages/AdminDashboard/AdminDashboard';
import CreateQuiz from './pages/AdminDashboard/CreateQuiz/CreateQuiz';
import ViewQuiz from './pages/ViewQuiz/ViewQuiz';

function App() {
  return (
    <BrowserRouter>
      <div className="w-full min-h-screen">
        <Routes>
          <Route path="/" element={<JoinQuiz />} />
          <Route path="/quiz/:quizCode/:username" element={<ClientQuizContainer />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/create-quiz" element={<CreateQuiz />} />
          <Route path="/admin/view-quiz/:id" element={<ViewQuiz />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
