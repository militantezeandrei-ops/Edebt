import React, { useState, useCallback } from 'react';
import HandwrittenCapture from './HandwrittenCapture';
import OrderSelection from './OrderSelection';
import CreateCustomer from './CreateCustomer';
import ConnectionTest from './ConnectionTest';
import StaffCustomers from './StaffCustomers';
import AnalyticsDashboard from './AnalyticsDashboard';
import SyncManager from './SyncManager';
import OfflineIndicator from './OfflineIndicator';
import './StaffApp.css';

const StaffApp = ({ onLogout, darkMode, toggleDarkMode }) => {
    const [activeTab, setActiveTab] = useState('capture');
    const username = localStorage.getItem('username') || 'Staff';

    // Capture flow states (same as original App.js)
    const [scannedCustomerId, setScannedCustomerId] = useState(null);
    const [customerInfo, setCustomerInfo] = useState(null);
    const [showOrderSelection, setShowOrderSelection] = useState(false);
    const [showCreateCustomer, setShowCreateCustomer] = useState(false);
    const [pendingCustomerId, setPendingCustomerId] = useState(null);
    const [pendingItems, setPendingItems] = useState(null);
    const [pendingOrderId, setPendingOrderId] = useState(null);
    const [captureKey, setCaptureKey] = useState(0);
    const [returnToCapture, setReturnToCapture] = useState(false);
    const [newlyCreatedCustomer, setNewlyCreatedCustomer] = useState(null);

    const resetCapture = useCallback(() => {
        setActiveTab('capture');
        setScannedCustomerId(null);
        setCustomerInfo(null);
        setShowOrderSelection(false);
        setShowCreateCustomer(false);
        setPendingCustomerId(null);
        setPendingItems(null);
        setCaptureKey(prev => prev + 1);
    }, []);

    const handleScanSuccess = useCallback((customerId, customerData) => {
        setScannedCustomerId(customerId);
        setCustomerInfo(customerData);
        setShowOrderSelection(true);
        setShowCreateCustomer(false);
        setReturnToCapture(customerData?.returnToCapture || false);
    }, []);

    const handleCustomerNotFound = useCallback((scannedId, items = [], orderId = null) => {
        setPendingCustomerId(scannedId);
        setPendingItems(items);
        setPendingOrderId(orderId);
        setShowCreateCustomer(true);
    }, []);

    const handleCustomerCreated = useCallback((customerId, customerData) => {
        if (pendingOrderId) {
            setNewlyCreatedCustomer(customerData);
            setShowCreateCustomer(false);
            setPendingCustomerId(null);
            setPendingItems(null);
        } else {
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

    const handleCancelCreateCustomer = () => {
        setShowCreateCustomer(false);
        setPendingCustomerId(null);
        setPendingOrderId(null);
    };

    const handleOrderSaved = () => {
        if (returnToCapture) {
            setShowOrderSelection(false);
            setScannedCustomerId(null);
            setCustomerInfo(null);
            setReturnToCapture(false);
        } else {
            resetCapture();
        }
    };

    const handleBackFromOrder = () => {
        if (returnToCapture) {
            setShowOrderSelection(false);
            setScannedCustomerId(null);
            setCustomerInfo(null);
            setReturnToCapture(false);
        } else {
            resetCapture();
        }
    };

    const renderContent = () => {
        if (activeTab === 'customers') return <StaffCustomers />;
        if (activeTab === 'analytics') return <AnalyticsDashboard onBack={() => { }} />;
        if (activeTab === 'settings') {
            return (
                <div className="staff-settings">
                    <div className="settings-card">
                        <h3>⚙️ Settings</h3>
                        <div className="setting-item" onClick={toggleDarkMode}>
                            <span>{darkMode ? '☀️' : '🌙'}</span>
                            <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
                        </div>
                        <div className="setting-item info">
                            <span>👤</span>
                            <span>Logged in as: <b>{username}</b> (Staff)</span>
                        </div>
                        <button className="staff-logout-btn" onClick={onLogout}>🚪 Logout</button>
                    </div>
                </div>
            );
        }

        // Capture tab
        return (
            <>
                {showOrderSelection && scannedCustomerId && (
                    <OrderSelection
                        customerId={scannedCustomerId}
                        initialCustomer={customerInfo}
                        onOrderSaved={handleOrderSaved}
                        onBack={handleBackFromOrder}
                    />
                )}

                {showCreateCustomer && pendingCustomerId && (
                    <CreateCustomer
                        scannedId={pendingCustomerId}
                        onCustomerCreated={handleCustomerCreated}
                        onCancel={handleCancelCreateCustomer}
                    />
                )}

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
            </>
        );
    };

    return (
        <div className="staff-layout">
            <SyncManager onSyncComplete={() => console.log('[StaffApp] Sync complete')} />
            <OfflineIndicator onSyncClick={() => window.triggerSync && window.triggerSync()} />

            <header className="staff-header">
                <span className="staff-greeting">📱 Hi, {username}</span>
                <span className="staff-role-badge">Staff</span>
            </header>

            <main className="staff-main">
                {renderContent()}
            </main>

            {/* Bottom Navigation */}
            <nav className="staff-bottom-nav">
                <button
                    className={`staff-nav-item ${activeTab === 'customers' ? 'active' : ''}`}
                    onClick={() => setActiveTab('customers')}
                >
                    <span className="nav-icon">👥</span>
                    <span className="nav-label">Customers</span>
                </button>

                <div className="staff-fab-container">
                    <button
                        className={`staff-fab ${activeTab === 'capture' ? 'active' : ''}`}
                        onClick={resetCapture}
                    >
                        📝
                    </button>
                </div>

                <button
                    className={`staff-nav-item ${activeTab === 'analytics' ? 'active' : ''}`}
                    onClick={() => setActiveTab('analytics')}
                >
                    <span className="nav-icon">📊</span>
                    <span className="nav-label">Analytics</span>
                </button>

                <button
                    className={`staff-nav-item ${activeTab === 'settings' ? 'active' : ''}`}
                    onClick={() => setActiveTab('settings')}
                >
                    <span className="nav-icon">⚙️</span>
                    <span className="nav-label">Settings</span>
                </button>
            </nav>
        </div>
    );
};

export default StaffApp;
