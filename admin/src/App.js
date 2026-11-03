import React, { useState } from 'react';
import Login from './components/Login';
import UsersTable from './components/UsersTable';
import QuizManager from './components/QuizManager';
import UserSchedule from './components/UserSchedule';
import { AuthProvider, useAuth } from './context/AuthContext';

function AppContent() {
  const { currentUser, logout } = useAuth();
  const [view, setView] = useState('users');
  // User whose schedule is open on the Users tab; null shows the table
  const [selectedUser, setSelectedUser] = useState(null);

  const showView = (next) => {
    setView(next);
    setSelectedUser(null);
  };

  return (
    <div className="App">
      <header className="app-header">
        {currentUser && (
          <div className="header-top-row">
            <div className="user-badge" style={{ marginLeft: 'auto' }}>
              <span>👤 {currentUser.username}</span>
              <button className="logout-button" onClick={logout}>Log Out</button>
            </div>
          </div>
        )}
        <h1>🛠️ Research Admin Portal</h1>
        <p>Track participant preferences and watch activity</p>
        {currentUser && (
          <div className="admin-tabs">
            <button
              className={`admin-tab-button ${view === 'users' ? 'active' : ''}`}
              onClick={() => showView('users')}
            >
              Users
            </button>
            <button
              className={`admin-tab-button ${view === 'quizzes' ? 'active' : ''}`}
              onClick={() => showView('quizzes')}
            >
              Quiz Questions
            </button>
          </div>
        )}
      </header>

      {!currentUser ? (
        <Login />
      ) : view === 'quizzes' ? (
        <QuizManager />
      ) : selectedUser ? (
        <UserSchedule user={selectedUser} onBack={() => setSelectedUser(null)} />
      ) : (
        <UsersTable onSelectUser={setSelectedUser} />
      )}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
