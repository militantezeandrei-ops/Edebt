import React, { useState, useCallback, useEffect } from 'react';
import './App.css';

import HandwrittenCapture from './components/HandwrittenCapture';
import OrderSelection from './components/OrderSelection';
import CustomerInfo from './components/CustomerInfo';
import CreateCustomer from './components/CreateCustomer';
import ConnectionTest from './components/ConnectionTest';
import WeeklyReport from './components/WeeklyReport';
import CustomerLedger from './components/CustomerLedger';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import Settings from './components/Settings';
import Login from './components/Login';
import SyncManager from './components/SyncManager';
import OfflineIndicator from './components/OfflineIndicator';

function App() {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('capture');
  const [scannedCustomerId, setScannedCustomerId] = useState(null);
  const [customerInfo, setCustomerInfo] = useState(null);

  // Scanner specific states
  const [showOrderSelection, setShowOrderSelection] = useState(false);
  const [showCreateCustomer, setShowCreateCustomer] = useState(false);
  const [pendingCustomerId, setPendingCustomerId] = useState(null);
  const [pendingItems, setPendingItems] = useState(null);
  const [pendingOrderId, setPendingOrderId] = useState(null); // Track which order in multi-scan needs customer
  const [captureKey, setCaptureKey] = useState(0); // To force remount
  const [returnToCapture, setReturnToCapture] = useState(false); // For edit-and-back flow
  const [newlyCreatedCustomer, setNewlyCreatedCustomer] = useState(null); // For multi-scan customer creation

  // Check if app is installable
  const [isInstallable, setIsInstallable] = useState(false);

  // Dark Mode State
  const [darkMode, setDarkMode] = useState(localStorage.getItem('darkMode') === 'true');

  useEffect(() => {
    // Check for existing session
    const auth = localStorage.getItem('isAuthenticated');
    if (auth === 'true') {
      setIsAuthenticated(true);
    }

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setIsInstallable(true);
    });
  }, []);

  // Apply Dark Mode Effect
  useEffect(() => {
    if (darkMode) {
      document.body.setAttribute('data-theme', 'dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.body.removeAttribute('data-theme');
      localStorage.setItem('darkMode', 'false');
    }
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const handleLogin = () => {
    setIsAuthenticated(true);
    localStorage.setItem('isAuthenticated', 'true');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('isAuthenticated');
    setActiveTab('scanner'); // Reset tab
  };


  const handleInstallClick = () => {
    if (window.showInstallPrompt) {
      window.showInstallPrompt();
    }
  };

  const resetCapture = useCallback(() => {
    setActiveTab('capture');
    setScannedCustomerId(null);
    setCustomerInfo(null);
    setShowOrderSelection(false);
    setShowCreateCustomer(false);
    setPendingCustomerId(null);
    setPendingItems(null);
    setCaptureKey(prev => prev + 1); // Force remount of capture component
  }, []);

  const handleScanSuccess = useCallback((customerId, customerData) => {
    setScannedCustomerId(customerId);
    setCustomerInfo(customerData);
    setShowOrderSelection(true);
    setShowCreateCustomer(false);
    // Track if this is an edit from capture results
    setReturnToCapture(customerData?.returnToCapture || false);
  }, []);

  const handleCustomerNotFound = useCallback((scannedId, items = [], orderId = null) => {
    setPendingCustomerId(scannedId);
    setPendingItems(items);
    setPendingOrderId(orderId); // Track which order in multi-scan
    setShowCreateCustomer(true);
  }, []);

  const handleCustomerCreated = useCallback((customerId, customerData) => {
    // If this was from a multi-scan order (has pendingOrderId), return to capture results
    if (pendingOrderId) {
      // Pass the new customer back to HandwrittenCapture to update the order
      setNewlyCreatedCustomer(customerData);
      setShowCreateCustomer(false);
      setPendingCustomerId(null);
      setPendingItems(null);
      // Don't reset capture key - preserve the capture state
    } else {
      // Original flow: go to OrderSelection
      if (pendingItems && pendingItems.length > 0) {
        const enrichedCustomer = {
          ...customerData,
          capturedItems: pendingItems,
          shouldAutoSave: true
        };
        handleScanSuccess(customerId, enrichedCustomer);
      } else {
        handleScanSuccess(customerId, customerData);
      }
      setPendingItems(null);
    }
    setPendingOrderId(null);
  }, [handleScanSuccess, pendingItems, pendingOrderId]);

  const handleClearNewCustomer = useCallback(() => {
    setNewlyCreatedCustomer(null);
  }, []);

  // ...

  const handleCancelCreateCustomer = () => {
    setShowCreateCustomer(false);
    setPendingCustomerId(null);
    setPendingOrderId(null);
    // Don't reset captureKey if we came from multi-scan
  };

  const handleOrderSaved = () => {
    if (returnToCapture) {
      // Return to capture results instead of full reset
      setShowOrderSelection(false);
      setScannedCustomerId(null);
      setCustomerInfo(null);
      setReturnToCapture(false);
      // Don't increment captureKey - preserve capture state
    } else {
      resetCapture();
    }
  };

  const handleBackFromOrder = () => {
    if (returnToCapture) {
      // Return to capture results
      setShowOrderSelection(false);
      setScannedCustomerId(null);
      setCustomerInfo(null);
      setReturnToCapture(false);
    } else {
      resetCapture();
    }
  };

  const renderContent = () => {
    if (activeTab === 'ledger') return <CustomerLedger onBack={resetCapture} />;
    if (activeTab === 'analytics') return <AnalyticsDashboard onBack={resetCapture} />;
    if (activeTab === 'settings') return <Settings onBack={resetCapture} onLogout={handleLogout} darkMode={darkMode} toggleDarkMode={toggleDarkMode} />;

    // Default: Handwritten Capture View
    // Keep HandwrittenCapture mounted to preserve state when editing
    const isEditingFromCapture = showOrderSelection && returnToCapture;

    return (
      <>
        {/* Order Selection Overlay - shown when editing */}
        {showOrderSelection && scannedCustomerId && (
          <OrderSelection
            customerId={scannedCustomerId}
            initialCustomer={customerInfo}
            onOrderSaved={handleOrderSaved}
            onBack={handleBackFromOrder}
          />
        )}

        {/* Create Customer Form */}
        {showCreateCustomer && pendingCustomerId && (
          <CreateCustomer
            scannedId={pendingCustomerId}
            onCustomerCreated={handleCustomerCreated}
            onCancel={handleCancelCreateCustomer}
          />
        )}

        {/* Always keep HandwrittenCapture mounted to preserve state */}
        {/* Hide it visually when overlays are shown */}
        <div style={{ display: showOrderSelection || showCreateCustomer ? 'none' : 'block' }}>
          <ConnectionTest />
          <HandwrittenCapture
            key={captureKey}
            onCaptureSuccess={handleScanSuccess}
            onCustomerNotFound={handleCustomerNotFound}
            newlyCreatedCustomer={newlyCreatedCustomer}
            onClearNewCustomer={handleClearNewCustomer}
          />
        </div>

        {customerInfo && !showOrderSelection && !showCreateCustomer && <CustomerInfo customer={customerInfo} />}
      </>
    );
  };

  // If not authenticated, show Login only
  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="App">
      <div className="container main-content">
        <header className="app-header">
          <p>Capture handwritten orders for customers</p>
          {isInstallable && (
            <button key="install-btn" onClick={handleInstallClick} className="install-button">
              📱 Install App
            </button>
          )}
        </header>

        <SyncManager onSyncComplete={() => {
          // Just log - don't reset navigation on sync
          console.log('[App] Sync complete');
        }} />

        <OfflineIndicator onSyncClick={() => window.triggerSync && window.triggerSync()} />

        {renderContent()}
      </div>

      {/* Unified Bottom Navigation */}
      <nav className="bottom-nav">
        <button
          className={`nav-item ${activeTab === 'ledger' ? 'active' : ''}`}
          onClick={() => setActiveTab('ledger')}
        >
          <span className="nav-icon">👥</span>
          <span className="nav-label">Customers</span>
        </button>

        <div className="fab-container">
          <button
            className={`fab-button ${activeTab === 'capture' ? 'active' : ''}`}
            onClick={resetCapture}
          >
            📝
          </button>
        </div>

        <button
          className={`nav-item ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          <span className="nav-icon">📈</span>
          <span className="nav-label">Analytics</span>
        </button>

        <button
          className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <span className="nav-icon">⚙️</span>
          <span className="nav-label">Settings</span>
        </button>
      </nav>
    </div>
  );
}

export default App;
