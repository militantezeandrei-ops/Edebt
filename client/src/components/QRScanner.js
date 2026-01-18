import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import axios from 'axios';
import API_URL from '../config/api';
import './QRScanner.css';

const QRScanner = ({ onScanSuccess, onCustomerNotFound }) => {
  const scannerRef = useRef(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const isScanningRef = useRef(false);
  const [isSecureContext, setIsSecureContext] = useState(true);

  // Check if running in secure context (HTTPS or localhost)
  useEffect(() => {
    const isSecure = window.isSecureContext || 
                     window.location.protocol === 'https:' || 
                     window.location.hostname === 'localhost' ||
                     window.location.hostname === '127.0.0.1';
    
    if (!isSecure) {
      setIsSecureContext(false);
      setError('Camera access requires HTTPS or localhost. Please use https:// or access via localhost.');
    }
  }, []);

  const handleScan = useCallback(async (scannedText) => {
    // Prevent multiple simultaneous scans
    if (isScanningRef.current) {
      return;
    }
    
    isScanningRef.current = true;
    setLoading(true);
    setError(null);

    try {
      // Try to fetch customer by unique ID
      console.log('Fetching customer:', scannedText, 'from:', `${API_URL}/api/customer/${scannedText}`);
      const response = await axios.get(`${API_URL}/api/customer/${scannedText}`, {
        timeout: 10000 // 10 second timeout
      });
      
      console.log('Customer response:', response.data);
      
      if (response.data) {
        // Stop scanner
        if (scannerRef.current) {
          try {
            await scannerRef.current.clear();
          } catch (err) {
            console.error("Error clearing scanner:", err);
          }
          scannerRef.current = null;
        }
        
        // Reset scanning state before passing to parent
        isScanningRef.current = false;
        setLoading(false);
        
        // Pass customer data to parent
        onScanSuccess(scannedText, response.data);
      }
    } catch (err) {
      if (err.response && err.response.status === 404) {
        // Stop scanner
        if (scannerRef.current) {
          try {
            await scannerRef.current.clear();
          } catch (clearErr) {
            console.error("Error clearing scanner:", clearErr);
          }
          scannerRef.current = null;
        }
        
        // Notify parent to show create customer dialog
        if (onCustomerNotFound) {
          onCustomerNotFound(scannedText);
        } else {
          setError(`Customer with ID "${scannedText}" not found. Please create the customer first or scan a valid QR code.`);
          isScanningRef.current = false;
          setLoading(false);
        }
      } else {
        // Network or other errors
        console.error('API Error:', err);
        console.error('API URL:', API_URL);
        console.error('Full error:', err.message);
        
        let errorMessage = 'Error fetching customer data. ';
        if (err.code === 'ECONNREFUSED' || err.message.includes('Network Error')) {
          errorMessage += 'Cannot connect to server. Make sure the backend is running on ' + API_URL;
        } else if (err.code === 'ERR_NETWORK') {
          errorMessage += 'Network error. Check your connection and backend server.';
        } else {
          errorMessage += err.message || 'Please try again.';
        }
        
        setError(errorMessage);
        isScanningRef.current = false;
        setLoading(false);
      }
    }
  }, [onScanSuccess, onCustomerNotFound]);

  // Reset state when component mounts
  useEffect(() => {
    // Reset scanning state
    isScanningRef.current = false;
    setLoading(false);
    setError(null);
  }, []);

  useEffect(() => {
    // Don't initialize scanner if not in secure context
    if (!isSecureContext) {
      return;
    }

    // Clear any existing content in the container first
    const qrReaderElement = document.getElementById("qr-reader");
    if (qrReaderElement) {
      qrReaderElement.innerHTML = "";
    }

    // Reset scanning state when scanner is shown
    isScanningRef.current = false;
    setLoading(false);
    setError(null);

    // Don't create if scanner already exists
    if (scannerRef.current) {
      return;
    }

    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      try {
        const scanner = new Html5QrcodeScanner(
          "qr-reader",
          {
            qrbox: {
              width: 250,
              height: 250
            },
            fps: 10,
            aspectRatio: 1.0
          },
          false
        );

        scanner.render(
          (decodedText) => {
            handleScan(decodedText);
          },
          (errorMessage) => {
            // Handle scan error - check for secure context errors
            if (errorMessage && errorMessage.includes('secure context')) {
              setIsSecureContext(false);
              setError('Camera access requires HTTPS. Please access via https:// or localhost.');
            }
          }
        );

        scannerRef.current = scanner;
      } catch (err) {
        if (err.message && err.message.includes('secure context')) {
          setIsSecureContext(false);
          setError('Camera access requires HTTPS. Please access via https:// or localhost.');
        } else {
          setError('Error initializing camera: ' + err.message);
        }
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      if (scannerRef.current) {
        scannerRef.current.clear().catch(err => {
          console.error("Error clearing scanner:", err);
        });
        scannerRef.current = null;
      }
      // Clear the container element
      const qrReaderElement = document.getElementById("qr-reader");
      if (qrReaderElement) {
        qrReaderElement.innerHTML = "";
      }
      isScanningRef.current = false;
    };
  }, [handleScan, isSecureContext]);

  return (
    <div className="qr-scanner-container">
      <div className="card">
        <h2>Scan QR Code</h2>
        <p className="scanner-instruction">
          Point your camera at the customer's QR code to scan their unique ID
        </p>
        
        {!isSecureContext && (
          <div className="error-message" style={{ 
            background: '#fff3cd', 
            color: '#856404', 
            border: '1px solid #ffc107',
            padding: '20px',
            borderRadius: '8px',
            marginBottom: '20px'
          }}>
            <h3 style={{ marginTop: 0 }}>⚠️ Secure Context Required</h3>
            <p><strong>Camera access requires HTTPS or localhost.</strong></p>
            <p>To use the camera:</p>
            <ul style={{ textAlign: 'left', display: 'inline-block' }}>
              <li><strong>Development:</strong> Use <code>http://localhost:3000</code></li>
              <li><strong>Production:</strong> Deploy with HTTPS (Netlify, Vercel provide this automatically)</li>
            </ul>
            <p style={{ marginBottom: 0 }}>
              <strong>Current URL:</strong> {`${window.location.protocol}//${window.location.host}`}
            </p>
          </div>
        )}

        {error && isSecureContext && (
          <div className="error-message">
            {error}
          </div>
        )}

        {loading && (
          <div className="loading-message">
            Processing scan...
          </div>
        )}

        {isSecureContext && <div id="qr-reader" className="qr-reader"></div>}
      </div>
    </div>
  );
};

export default QRScanner;
