import React, { useState, useCallback } from 'react';
import './App.css';
import QRScanner from './components/QRScanner';
import OrderSelection from './components/OrderSelection';
import CustomerInfo from './components/CustomerInfo';
import CreateCustomer from './components/CreateCustomer';
import ConnectionTest from './components/ConnectionTest';

function App() {
  const [scannedCustomerId, setScannedCustomerId] = useState(null);
  const [customerInfo, setCustomerInfo] = useState(null);
  const [showOrderSelection, setShowOrderSelection] = useState(false);
  const [showScanner, setShowScanner] = useState(true);
  const [showCreateCustomer, setShowCreateCustomer] = useState(false);
  const [pendingCustomerId, setPendingCustomerId] = useState(null);

  const handleScanSuccess = useCallback((customerId, customerData) => {
    setScannedCustomerId(customerId);
    setCustomerInfo(customerData);
    setShowScanner(false);
    setShowOrderSelection(true);
    setShowCreateCustomer(false);
  }, []);

  const handleCustomerNotFound = useCallback((scannedId) => {
    setPendingCustomerId(scannedId);
    setShowCreateCustomer(true);
  }, []);

  const handleCustomerCreated = useCallback((customerId, customerData) => {
    handleScanSuccess(customerId, customerData);
  }, [handleScanSuccess]);

  const handleCancelCreateCustomer = () => {
    setShowCreateCustomer(false);
    setPendingCustomerId(null);
    // Force scanner to remount
    setShowScanner(false);
    setTimeout(() => {
      setShowScanner(true);
    }, 100);
  };

  const handleOrderSaved = () => {
    // Reset to allow scanning again
    setScannedCustomerId(null);
    setCustomerInfo(null);
    setShowOrderSelection(false);
    setShowScanner(true);
  };

  const handleBackToScanner = () => {
    setScannedCustomerId(null);
    setCustomerInfo(null);
    setShowOrderSelection(false);
    setShowCreateCustomer(false);
    setPendingCustomerId(null);
    // Force scanner to remount by toggling
    setShowScanner(false);
    setTimeout(() => {
      setShowScanner(true);
    }, 100);
  };

  // Check if app is installable
  const [isInstallable, setIsInstallable] = React.useState(false);

  React.useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setIsInstallable(true);
    });
  }, []);

  const handleInstallClick = () => {
    if (window.showInstallPrompt) {
      window.showInstallPrompt();
    }
  };

  return (
    <div className="App">
      <div className="container">
        <header className="app-header">
          <h1>QR Scanner - Customer Orders</h1>
          <p>Scan QR code to add orders for customers</p>
          {isInstallable && (
            <button 
              onClick={handleInstallClick}
              className="install-button"
            >
              📱 Install App
            </button>
          )}
        </header>

        {showScanner && (
          <>
            <ConnectionTest />
            <QRScanner 
              key="qr-scanner"
              onScanSuccess={handleScanSuccess}
              onCustomerNotFound={handleCustomerNotFound}
            />
          </>
        )}

        {showCreateCustomer && pendingCustomerId && (
          <CreateCustomer
            scannedId={pendingCustomerId}
            onCustomerCreated={handleCustomerCreated}
            onCancel={handleCancelCreateCustomer}
          />
        )}

        {customerInfo && (
          <CustomerInfo customer={customerInfo} />
        )}

        {showOrderSelection && scannedCustomerId && (
          <OrderSelection
            customerId={scannedCustomerId}
            onOrderSaved={handleOrderSaved}
            onBack={handleBackToScanner}
          />
        )}
      </div>
    </div>
  );
}

export default App;
