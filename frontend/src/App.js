import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LectureList from './components/LectureList';
import LecturePlayer from './components/LecturePlayer';
import PreferencesDialog from './components/PreferencesDialog';

function App() {
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferredIds, setPreferredIds] = useState(() => {
    const stored = localStorage.getItem('lecturePreferences');
    return stored ? JSON.parse(stored) : [];
  });

  return (
    <Router>
      <div className="App">
        <header className="app-header">
          <button className="preferences-button" onClick={() => setShowPreferences(true)}>
            ⚙️ Set Preferences
          </button>
          <h1>📚 Educational Lecture Platform</h1>
          <p>Expand your knowledge with expert-led courses</p>
        </header>
        {showPreferences && (
          <PreferencesDialog
            onClose={() => setShowPreferences(false)}
            onSave={setPreferredIds}
          />
        )}
        <Routes>
          <Route path="/" element={<LectureList preferredIds={preferredIds} />} />
          <Route path="/lecture/:id" element={<LecturePlayer />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
