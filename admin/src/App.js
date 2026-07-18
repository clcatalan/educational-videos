import React from 'react';
import Login from './components/Login';
import UsersTable from './components/UsersTable';
import { AuthProvider, useAuth } from './context/AuthContext';

function AppContent() {
  const { currentUser, logout } = useAuth();

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
      </header>

      {currentUser ? <UsersTable /> : <Login />}
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
