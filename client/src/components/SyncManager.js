import React, { useEffect, useState, useRef } from 'react';
import Swal from 'sweetalert2';
import { OfflineStorage } from '../utils/offlineStorage';
import { fullSync, getSyncStatus } from '../utils/syncHelpers';
import { initDB } from '../utils/indexedDB';

const SyncManager = ({ onSyncComplete }) => {
    const [isSyncing, setIsSyncing] = useState(false);
    const syncInProgress = useRef(false);
    const lastSyncTime = useRef(0);
    const hasInitialized = useRef(false);

    useEffect(() => {
        // Prevent double initialization in StrictMode
        if (hasInitialized.current) return;
        hasInitialized.current = true;

        // Initialize IndexedDB on mount
        initDB().then(() => {
            console.log('[SyncManager] IndexedDB initialized');
        });

        const handleOnline = async () => {
            console.log('[SyncManager] Back online - starting sync');

            // Show toast notification
            const Toast = Swal.mixin({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 2000
            });

            Toast.fire({
                icon: 'info',
                title: 'Back Online',
                text: 'Syncing data...'
            });

            await performSync();
        };

        const handleOffline = () => {
            console.log('[SyncManager] Gone offline');

            Swal.mixin({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000
            }).fire({
                icon: 'warning',
                title: 'Offline Mode',
                text: 'Changes will sync when online'
            });
        };

        // Listen for SW sync messages
        const handleSWMessage = (event) => {
            if (event.data && event.data.type === 'SYNC_ORDERS') {
                performSync();
            }
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.addEventListener('message', handleSWMessage);
        }

        // Initial sync on mount if online (only once, with delay)
        if (navigator.onLine) {
            setTimeout(() => {
                performSync(true);
            }, 2000);
        }

        // Periodic sync check (every 60 seconds)
        const interval = setInterval(() => {
            if (navigator.onLine && !syncInProgress.current) {
                checkAndSync();
            }
        }, 60000);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.removeEventListener('message', handleSWMessage);
            }
            clearInterval(interval);
        };
    }, []); // Empty deps - only run once

    const performSync = async (silent = false) => {
        // Debounce - prevent sync if one is already running or ran recently
        const now = Date.now();
        if (syncInProgress.current || (now - lastSyncTime.current) < 5000) {
            console.log('[SyncManager] Sync skipped - already in progress or too recent');
            return;
        }

        syncInProgress.current = true;
        setIsSyncing(true);
        lastSyncTime.current = now;

        console.log('[SyncManager] Performing full sync...');

        try {
            const result = await fullSync();

            if (result.success) {
                if (!silent && result.uploaded > 0) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Sync Complete',
                        text: `Uploaded ${result.uploaded} offline changes`,
                        timer: 3000,
                        showConfirmButton: false
                    });
                }

                if (onSyncComplete) {
                    onSyncComplete();
                }
            }
        } catch (error) {
            console.error('[SyncManager] Sync failed:', error);
        } finally {
            syncInProgress.current = false;
            setIsSyncing(false);
        }
    };

    const checkAndSync = async () => {
        const status = await getSyncStatus();
        if (status.pendingCount > 0) {
            console.log(`[SyncManager] Found ${status.pendingCount} pending items, syncing...`);
            performSync(true);
        }
    };

    // Expose sync function globally for manual trigger
    useEffect(() => {
        window.triggerSync = () => performSync(false);
        return () => {
            delete window.triggerSync;
        };
    }, []);

    return null;
};

export default SyncManager;
