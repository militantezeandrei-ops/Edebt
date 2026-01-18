import React, { useEffect, useState } from 'react';
import axios from 'axios';
import API_URL from '../config/api';

const ConnectionTest = () => {
  const [status, setStatus] = useState('checking');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const testConnection = async () => {
      // Check if API URL is set
      if (API_URL === 'BACKEND_URL_NOT_SET') {
        setStatus('error');
        setMessage('❌ Backend URL not configured! Please set REACT_APP_API_URL in Netlify environment variables.');
        return;
      }

      try {
        await axios.get(`${API_URL}/api/health`, {
          timeout: 5000
        });
        setStatus('connected');
        setMessage(`✅ Backend connected: ${API_URL}`);
      } catch (err) {
        setStatus('error');
        let errorMsg = `❌ Cannot connect to backend at ${API_URL}. `;
        
        if (API_URL.includes('localhost') && window.location.hostname !== 'localhost') {
          errorMsg += 'You are on Netlify but API URL points to localhost. Please set REACT_APP_API_URL in Netlify.';
        } else if (err.code === 'ERR_NETWORK' || err.message.includes('Network Error')) {
          errorMsg += 'Network error. Make sure the backend is deployed and running.';
        } else {
          errorMsg += err.message || 'Make sure the server is running.';
        }
        
        setMessage(errorMsg);
        console.error('Backend connection error:', err);
      }
    };

    testConnection();
  }, []);

  if (status === 'checking') {
    return (
      <div style={{ 
        padding: '10px', 
        background: '#d1ecf1', 
        color: '#0c5460', 
        borderRadius: '6px',
        marginBottom: '10px',
        fontSize: '0.9rem'
      }}>
        Checking backend connection...
      </div>
    );
  }

  return (
    <div style={{ 
      padding: '10px', 
      background: status === 'connected' ? '#d4edda' : '#f8d7da',
      color: status === 'connected' ? '#155724' : '#721c24',
      borderRadius: '6px',
      marginBottom: '10px',
      fontSize: '0.9rem'
    }}>
      {message}
    </div>
  );
};

export default ConnectionTest;
