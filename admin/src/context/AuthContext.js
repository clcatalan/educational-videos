import React, { createContext, useContext, useState } from 'react';

const STORAGE_KEY = 'adminUser';
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  });

  const login = async (username) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to log in');
    }

    if (!data.user.isAdmin) {
      throw new Error('This account does not have admin access');
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data.user));
    setCurrentUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider value={{ currentUser, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
