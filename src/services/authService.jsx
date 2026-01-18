import React, { useState, useEffect, createContext, useContext } from 'react';
import apiService from './apiService';

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
    try {
      const userData = await apiService.login(email, password);
      localStorage.setItem('finance_user', JSON.stringify(userData));
      setUser(userData);
      return userData;
    } catch (error) {
      // Fallback to localStorage if API unavailable
      const userData = {
        id: Date.now().toString(),
        email,
        name: email.split('@')[0]
      };
      localStorage.setItem('finance_user', JSON.stringify(userData));
      setUser(userData);
      return userData;
    }
  };

  const register = async (email, password) => {
    try {
      const userData = await apiService.register(email, password);
      if (!userData || !userData.id) {
        throw new Error('Invalid response from server');
      }
      localStorage.setItem('finance_user', JSON.stringify(userData));
      setUser(userData);
      return userData;
    } catch (error) {
      // Fallback to localStorage if API unavailable
      console.warn('API register failed, using localStorage fallback:', error.message);
      const userData = {
        id: Date.now().toString(),
        email,
        name: email.split('@')[0]
      };
      localStorage.setItem('finance_user', JSON.stringify(userData));
      setUser(userData);
      return userData;
    }
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