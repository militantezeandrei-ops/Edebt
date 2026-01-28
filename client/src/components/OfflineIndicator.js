import React, { useState, useEffect } from 'react';
import { OfflineStorage } from '../utils/offlineStorage';
import './OfflineIndicator.css';

const OfflineIndicator = ({ onSyncClick }) => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [pendingCount, setPendingCount] = useState(0);
    const [lastSync, setLastSync] = useState(null);
    const [showDetails, setShowDetails] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(() => {
        return document.body.getAttribute('data-theme') === 'dark';
    });

    useEffect(() => {
        // Check dark mode
        const checkDarkMode = () => {
            const theme = document.body.getAttribute('data-theme');
            console.log('[OfflineIndicator] Theme detected:', theme);
            setIsDarkMode(theme === 'dark');
        };

        checkDarkMode();

        // Observe body attribute changes for theme
        const observer = new MutationObserver(checkDarkMode);
        observer.observe(document.body, { attributes: true, attributeFilter: ['data-theme'] });

        const updateStatus = () => {
            setIsOnline(navigator.onLine);
        };

        window.addEventListener('online', updateStatus);
        window.addEventListener('offline', updateStatus);

        // Get pending sync count
        const updatePendingCount = async () => {
            try {
                const count = await OfflineStorage.getPendingSyncCount();
                setPendingCount(count);

                const syncTime = await OfflineStorage.getLastSyncTime();
                setLastSync(syncTime);
            } catch (e) {
                console.error('Failed to get sync status', e);
            }
        };

        updatePendingCount();
        const interval = setInterval(updatePendingCount, 10000); // Update every 10s

        return () => {
            observer.disconnect();
            window.removeEventListener('online', updateStatus);
            window.removeEventListener('offline', updateStatus);
            clearInterval(interval);
        };
    }, []);

    const formatLastSync = (timestamp) => {
        if (!timestamp) return 'Never';
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;

        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;

        return date.toLocaleDateString();
    };

    return (
        <>
            <div
                className={`offline-indicator ${isOnline ? 'online' : 'offline'} ${pendingCount > 0 ? 'has-pending' : ''}`}
                onClick={() => setShowDetails(!showDetails)}
            >
                <span className="status-dot" />
                <span className="status-text">
                    {isOnline ? '●' : '○'}
                </span>
                {pendingCount > 0 && (
                    <span className="pending-badge">{pendingCount}</span>
                )}
            </div>

            {showDetails && (
                <div
                    className={`offline-details-popup ${isDarkMode ? 'dark' : ''}`}
                    style={isDarkMode ? { background: '#1e293b', color: '#f1f5f9', border: '1px solid #334155' } : {}}
                >
                    <div className="popup-header">
                        <span className={`status-label ${isOnline ? 'online' : 'offline'}`}>
                            {isOnline ? '🟢 Online' : '🔴 Offline'}
                        </span>
                        <button className="close-btn" onClick={() => setShowDetails(false)}>✕</button>
                    </div>

                    <div
                        className={`popup-body ${isDarkMode ? 'dark' : ''}`}
                        style={isDarkMode ? { background: '#1e293b' } : {}}
                    >
                        <div
                            className="detail-row"
                            style={isDarkMode ? {
                                background: '#0f172a', /* Requested dark navy background */
                                borderColor: '#334155',
                                padding: '8px 12px', /* Add padding for "input" look */
                                borderRadius: '8px', /* Rounded corners */
                                marginBottom: '8px' /* Spacing between rows */
                            } : {}}
                        >
                            <span style={isDarkMode ? { color: '#94a3b8' } : {}}>Pending Sync:</span>
                            <span
                                className={pendingCount > 0 ? 'pending-count' : ''}
                                style={isDarkMode && pendingCount === 0 ? { color: '#f1f5f9' } : {}}
                            >
                                {pendingCount} items
                            </span>
                        </div>
                        <div
                            className="detail-row"
                            style={isDarkMode ? {
                                background: '#0f172a',
                                borderColor: '#334155',
                                padding: '8px 12px',
                                borderRadius: '8px'
                            } : {}}
                        >
                            <span style={isDarkMode ? { color: '#94a3b8' } : {}}>Last Sync:</span>
                            <span style={isDarkMode ? { color: '#f1f5f9' } : {}}>{formatLastSync(lastSync)}</span>
                        </div>
                    </div>

                    {isOnline && pendingCount > 0 && onSyncClick && (
                        <button className="sync-now-btn" onClick={onSyncClick}>
                            🔄 Sync Now
                        </button>
                    )}
                </div>
            )}
        </>
    );
};

export default OfflineIndicator;
