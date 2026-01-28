import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import axios from 'axios';
import API_URL from '../config/api';
import './QRScanner.css';
import { OfflineStorage } from '../utils/offlineStorage';

const QRScanner = ({ onScanSuccess, onCustomerNotFound }) => {
  const [scanMode, setScanMode] = useState('idle'); // 'idle', 'camera', 'file'
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const scannerRef = useRef(null);
  const fileInputRef = useRef(null);
  const [isSecureContext, setIsSecureContext] = useState(true);

  // Manual & Data State
  const [manualCode, setManualCode] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [suggestions, setSuggestions] = useState([]);

  // Check secure context
  useEffect(() => {
    const isSecure = window.isSecureContext ||
      window.location.protocol === 'https:' ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';
    setIsSecureContext(isSecure);
  }, []);

  const cleanupScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
      scannerRef.current = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupScanner();
    };
  }, []);

  const handleScanResult = useCallback(async (decodedText) => {
    setLoading(true);
    setError(null);

    // Stop scanning immediately upon success
    await cleanupScanner();
    setScanMode('idle');

    // === 1. LOCAL SEARCH (OFFLINE FIRST / SPEED OPTIMIZATION) ===
    // Check cached customers list first (Name or ID)
    const normalizedQuery = decodedText.toLowerCase().trim();
    // Re-verify we have customers loaded
    let localList = customers;
    if (localList.length === 0) {
      localList = OfflineStorage.loadData('customers') || [];
    }

    const foundLocal = localList.find(c =>
      (c.unique_id && c.unique_id.toLowerCase() === normalizedQuery) ||
      (c.name && c.name.toLowerCase() === normalizedQuery) ||
      (c._id === decodedText)
    );

    if (foundLocal) {
      console.log("Found customer in local cache:", foundLocal);
      onScanSuccess(foundLocal.unique_id, foundLocal);
      setLoading(false);
      return;
    }

    // === 2. SERVER SEARCH (Backup) ===
    try {
      console.log('Fetching customer from server:', decodedText);
      const response = await axios.get(`${API_URL}/api/customer/${decodedText}`, {
        timeout: 5000
      });

      if (response.data) {
        onScanSuccess(decodedText, response.data);
      }
    } catch (err) {
      if (err.response && err.response.status === 404) {
        if (onCustomerNotFound) {
          onCustomerNotFound(decodedText);
        } else {
          setError(`Customer "${decodedText}" not found locally or on server.`);
        }
      } else {
        // Network error and not found locally
        setError('Connection failed and customer not in offline cache.');
      }
    } finally {
      setLoading(false);
    }
  }, [customers, onScanSuccess, onCustomerNotFound]);

  const startCamera = async () => {
    if (!isSecureContext) {
      setError("Camera requires HTTPS or localhost.");
      return;
    }

    setScanMode('camera');
    setError(null);

    try {
      await cleanupScanner();

      const scanner = new Html5Qrcode("qr-reader-element");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          handleScanResult(decodedText);
        },
        (errorMessage) => {
          // Ignore frame parse errors
        }
      );
    } catch (err) {
      console.error("Camera start error:", err);
      setError("Could not start camera. Please ensure permissions are granted.");
      setScanMode('idle');
    }
  };

  // Fetch customers for autocomplete
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/customers`);
        setCustomers(res.data);
        OfflineStorage.saveData('customers', res.data);
      } catch (err) {
        console.error("Error loading customers:", err);
        // Offline Fallback
        const cached = OfflineStorage.loadData('customers');
        if (cached) {
          setCustomers(cached);
        }
      }
    };
    fetchCustomers();
  }, []);

  const handleManualSearchChange = (e) => {
    const value = e.target.value;
    setManualCode(value);

    if (value.length > 0) {
      const matches = customers.filter(c =>
        c.name.toLowerCase().includes(value.toLowerCase()) ||
        c.unique_id.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 5); // Limit to 5 suggestions
      setSuggestions(matches);
    } else {
      setSuggestions([]);
    }
  };

  const selectCustomer = (customer) => {
    onScanSuccess(customer.unique_id, customer);
    setShowManualInput(false);
    setManualCode('');
  };

  const submitManualCode = () => {
    if (manualCode.trim()) {
      handleScanResult(manualCode.trim());
    }
  };



  const cancelScan = async () => {
    await cleanupScanner();
    setScanMode('idle');
    setError(null);
  };

  return (
    <div className="qr-scanner-container">
      <div className="card scanner-card">
        <h2>Scan Code</h2>

        {error && (
          <div className={`error-message ${!isSecureContext ? 'warning-bg' : ''}`}>
            {error}
          </div>
        )}

        {loading && <div className="loading-message">Processing...</div>}

        {/* Main Interface */}
        <div className="scanner-ui">
          {scanMode === 'idle' && !showManualInput && (
            <div className="scanner-buttons">
              <button className="scanner-btn camera-btn" onClick={startCamera}>
                <span className="btn-icon">📸</span>
                Open Camera
              </button>

              <button className="scanner-btn manual-btn" onClick={() => setShowManualInput(true)}>
                <span className="btn-icon">⌨️</span>
                Manual Order
              </button>

              <p className="scanner-instruction">
                Use camera to scan or type name/ID manually
              </p>
            </div>
          )}

          {showManualInput && (
            <div className="manual-input-section fade-in">
              <h3>Search Customer</h3>
              <div className="bg-check-input">
                <input
                  type="text"
                  placeholder="Type name or ID..."
                  value={manualCode}
                  onChange={handleManualSearchChange}
                  className="manual-input"
                  autoFocus
                />
                {manualCode && (
                  <button className="clear-btn" onClick={() => { setManualCode(''); setSuggestions([]); }}>✕</button>
                )}
              </div>

              {suggestions.length > 0 && (
                <div className="suggestions-list">
                  {suggestions.map(c => (
                    <div key={c._id} className="suggestion-item" onClick={() => selectCustomer(c)}>
                      <span className="s-name">{c.name}</span>
                      <span className="s-id">{c.unique_id}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="manual-actions">
                <button className="button button-ghost" onClick={() => setShowManualInput(false)}>Cancel</button>
                {/* Add fallback Search button if they type exact ID but not in list? */}
                <button className="button button-primary" onClick={submitManualCode} disabled={!manualCode}>Search ID</button>
              </div>
            </div>
          )}

          {scanMode === 'camera' && (
            <div className="camera-view">
              <div id="qr-reader-element" className="qr-viewport"></div>
              <button className="button button-secondary cancel-btn" onClick={cancelScan}>
                Cancel Camera
              </button>
            </div>
          )}

          <div id="qr-reader-element" style={{ display: scanMode === 'camera' ? 'block' : 'none' }}></div>
        </div>
      </div>
    </div>
  );
};

export default QRScanner;
