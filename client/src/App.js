import React, { useState, useEffect } from 'react';
import './App.css';

import AdminApp from './components/AdminApp';
import StaffApp from './components/StaffApp';
import Login from './components/Login';

function App() {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);

  // Dark Mode State
  const [darkMode, setDarkMode] = useState(localStorage.getItem('darkMode') === 'true');

  useEffect(() => {
    // Check for existing session
    const auth = localStorage.getItem('isAuthenticated');
    const role = localStorage.getItem('userRole');
    if (auth === 'true' && (role === 'admin' || role === 'staff')) {
      setIsAuthenticated(true);
      setUserRole(role);
    } else {
      // Clear stale/invalid session data from old login system
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('userRole');
      localStorage.removeItem('username');
      localStorage.removeItem('loginLockoutEnd');
    }
  }, []);

  // Safety: if authenticated but role is invalid, log out via effect (not during render)
  useEffect(() => {
    if (isAuthenticated && userRole && userRole !== 'admin' && userRole !== 'staff') {
      setIsAuthenticated(false);
      setUserRole(null);
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('userRole');
      localStorage.removeItem('username');
    }
  }, [isAuthenticated, userRole]);

  // Apply Dark Mode Effect
  useEffect(() => {
    if (darkMode) {
      document.body.setAttribute('data-theme', 'dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.body.setAttribute('data-theme', 'light');
      localStorage.setItem('darkMode', 'false');
    }
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const handleLogin = (role) => {
    setIsAuthenticated(true);
    setUserRole(role);
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('userRole', role);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserRole(null);
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userRole');
    localStorage.removeItem('username');
  };

  // If not authenticated, show Login
  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  // Route to the correct dashboard based on role
  if (userRole === 'admin') {
    return (
      <AdminApp
        onLogout={handleLogout}
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
      />
    );
  }

  if (userRole === 'staff') {
    return (
      <StaffApp
        onLogout={handleLogout}
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
      />
    );
  }

  // Fallback while role is being resolved (e.g. during effect cleanup)
  return <Login onLogin={handleLogin} />;
}

export default App;
