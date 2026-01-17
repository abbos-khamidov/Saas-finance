import React, { useState, useEffect, createContext, useContext } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check localStorage for user
    const savedUser = localStorage.getItem('finance_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('finance_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    // Simple mock auth - in production use real auth
    const userData = {
      id: Date.now().toString(),
      email,
      name: email.split('@')[0]
    };
    localStorage.setItem('finance_user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const register = async (email, password) => {
    const userData = {
      id: Date.now().toString(),
      email,
      name: email.split('@')[0]
    };
    localStorage.setItem('finance_user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('finance_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}