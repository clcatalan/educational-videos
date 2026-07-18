import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LectureList from './components/LectureList';
import LecturePlayer from './components/LecturePlayer';
import PreferencesDialog from './components/PreferencesDialog';
import Login from './components/Login';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider, useAuth } from './context/AuthContext';

function Header({ showPreferences, setShowPreferences }) {
  const { currentUser, logout } = useAuth();

  return (
    <header className="app-header">
      <div className="header-top-row">
        {currentUser && (
          <button className="preferences-button" onClick={() => setShowPreferences(true)}>
            ⚙️ Set Preferences
          </button>
        )}
        {currentUser && (
          <div className="user-badge">
            <span>👤 {currentUser.username}</span>
            <button className="logout-button" onClick={logout}>Log Out</button>
          </div>
        )}
      </div>
      <h1>📚 Educational Lecture Platform</h1>
      <p>Expand your knowledge with expert-led courses</p>
    </header>
  );
}

function AppRoutes() {
  const { currentUser, savePreferences } = useAuth();
  const [showPreferences, setShowPreferences] = useState(false);

  const forcedOnboarding = Boolean(currentUser) && !currentUser.preferencesSet;
  const preferencesDialogOpen = showPreferences || forcedOnboarding;

  const handleSavePreferences = async (selectedIds) => {
    await savePreferences(selectedIds);
    setShowPreferences(false);
  };

  return (
    <div className="App">
      <Header showPreferences={showPreferences} setShowPreferences={setShowPreferences} />
      {preferencesDialogOpen && (
        <PreferencesDialog
          onClose={() => setShowPreferences(false)}
          onSave={handleSavePreferences}
          initialSelectedIds={currentUser?.preferredLectureIds || []}
          forced={forcedOnboarding}
        />
      )}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={
          <ProtectedRoute>
            <LectureList preferredIds={currentUser?.preferredLectureIds || []} />
          </ProtectedRoute>
        } />
        <Route path="/lecture/:id" element={
          <ProtectedRoute>
            <LecturePlayer />
          </ProtectedRoute>
        } />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;
