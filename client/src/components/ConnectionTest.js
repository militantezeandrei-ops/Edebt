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
        setMessage('Offline Mode');
        return;
      }

      // 2. Check Backend
      if (API_URL === 'BACKEND_URL_NOT_SET') {
        setStatus('error');
        setMessage('Backend Config Missing');
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
    window.addEventListener('online', checkStatus);
    window.addEventListener('offline', checkStatus);
    // Interval check every 30s
    const interval = setInterval(checkStatus, 30000);

    return () => {
      window.removeEventListener('online', checkStatus);
      window.removeEventListener('offline', checkStatus);
      clearInterval(interval);
    };
  }, []);

  if (status === 'checking') return null; // Don't show anything while checking to reduce flicker

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      marginBottom: '20px',
      animation: 'fadeIn 0.5s ease'
    }}>
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '6px 16px',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(5px)',
        borderRadius: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        fontSize: '0.85rem',
        fontWeight: '600',
        color: '#4b5563',
        gap: '8px',
        border: '1px solid rgba(255, 255, 255, 0.5)'
      }}>
        <span style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: status === 'connected' ? '#10b981' : status === 'offline' ? '#f59e0b' : '#ef4444',
          boxShadow: status === 'connected' ? '0 0 8px #10b981' : 'none',
          display: 'block'
        }}></span>
        {message}
        {status === 'error' && (
          <span style={{
            fontSize: '0.7rem',
            opacity: 0.7,
            marginLeft: '5px',
            borderLeft: '1px solid #ddd',
            paddingLeft: '5px'
          }}>
            ({API_URL})
          </span>
        )}
      </div>
    </div>
  );
};

export default ConnectionTest;
