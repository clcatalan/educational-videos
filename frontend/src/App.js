import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LectureList from './components/LectureList';
import LecturePlayer from './components/LecturePlayer';

function App() {
  return (
    <Router>
      <div className="App">
        <header className="app-header">
          <h1>📚 Educational Lecture Platform</h1>
          <p>Expand your knowledge with expert-led courses</p>
        </header>
        <Routes>
          <Route path="/" element={<LectureList />} />
          <Route path="/lecture/:id" element={<LecturePlayer />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
