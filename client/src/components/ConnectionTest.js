import React, { useEffect, useState } from 'react';
import axios from 'axios';
import API_URL from '../config/api';

const ConnectionTest = () => {
  const [status, setStatus] = useState('checking');
  const [message, setMessage] = useState('');


  useEffect(() => {
    const checkStatus = async () => {
      // 1. Check Browser Connectivity
      if (!navigator.onLine) {
        setStatus('offline');
        setMessage('Offline');
        return;
      }

      // 2. Check Backend
      if (API_URL === 'BACKEND_URL_NOT_SET') {
        setStatus('error');
        setMessage('Config Error');
        return;
      }

      try {
        await axios.get(`${API_URL}/api/health`, { timeout: 5000 });
        setStatus('connected');
        setMessage('System Online');
      } catch (err) {
        setStatus('error');
        setMessage('System Offline');
      }
    };

    checkStatus();
    // ... rest of the logic
  }, []);

  return (
    <div style={{
      position: 'absolute',
      top: '12px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 1000,
      display: 'flex',
      justifyContent: 'center',
      animation: 'fadeIn 0.5s ease'
    }}>
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '6px 14px',
        backgroundColor: 'rgba(26, 26, 46, 0.85)',
        backdropFilter: 'blur(10px)',
        borderRadius: '20px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        fontSize: '0.75rem',
        fontWeight: '600',
        color: '#f8fafc',
        gap: '6px',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <span style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: status === 'connected' ? '#10b981' : status === 'offline' ? '#f59e0b' : '#ef4444',
          boxShadow: status === 'connected' ? '0 0 8px #10b981' : 'none',
          display: 'block'
        }}></span>
        {status === 'checking' ? 'Connecting...' : message}
      </div>
    </div>
  );
};

export default ConnectionTest;
