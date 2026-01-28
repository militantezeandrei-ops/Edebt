import * as IDB from './indexedDB';

// Initialize IndexedDB on module load
let dbInitialized = false;
const initPromise = IDB.initDB().then(() => {
    dbInitialized = true;
    console.log('OfflineStorage: IndexedDB ready');
}).catch(err => {
    console.error('OfflineStorage: IndexedDB init failed, falling back to localStorage', err);
});

// Helper to ensure DB is ready
const ensureDB = async () => {
    if (!dbInitialized) {
        await initPromise;
    }
};

export const OfflineStorage = {
    // --- Data Caching (Legacy localStorage fallback + IndexedDB) ---
    saveData: async (key, data) => {
        try {
            // Save to localStorage for quick access
            localStorage.setItem(key, JSON.stringify({
                timestamp: Date.now(),
                data: data
            }));

            // Also save to IndexedDB for persistence
            await ensureDB();
            if (key === 'customers' && Array.isArray(data)) {
                await IDB.saveCustomers(data);
            } else if (key === 'menu' && Array.isArray(data)) {
                await IDB.saveMenuItems(data);
            } else if (key === 'orders' && Array.isArray(data)) {
                await IDB.saveOrders(data);
            }
        } catch (e) {
            console.error("Failed to save data", e);
        }
    },

    loadData: (key) => {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item).data : null;
        } catch (e) {
            console.error("Failed to load from localStorage", e);
            return null;
        }
    },

    // Async version that tries IndexedDB first
    loadDataAsync: async (key) => {
        try {
            await ensureDB();

            if (key === 'customers') {
                const data = await IDB.getAllCustomers();
                if (data && data.length > 0) return data;
            } else if (key === 'menu') {
                const data = await IDB.getAllMenuItems();
                if (data && data.length > 0) return data;
            } else if (key === 'orders') {
                const data = await IDB.getAllOrders();
                if (data && data.length > 0) return data;
            }

            // Fallback to localStorage
            return OfflineStorage.loadData(key);
        } catch (e) {
            console.error("Failed to load data async", e);
            return OfflineStorage.loadData(key);
        }
    },

    // --- Customer Operations ---
    getCustomer: async (uniqueId) => {
        await ensureDB();
        const customer = await IDB.getCustomer(uniqueId);
        if (customer) return customer;

        // Fallback to localStorage list
        const customers = OfflineStorage.loadData('customers') || [];
        return customers.find(c => c.unique_id === uniqueId || c._id === uniqueId);
    },

    saveCustomer: async (customer) => {
        await ensureDB();
        await IDB.saveCustomer(customer);

        // Update localStorage cache too
        const customers = OfflineStorage.loadData('customers') || [];
        const idx = customers.findIndex(c => c.unique_id === customer.unique_id);
        if (idx >= 0) {
            customers[idx] = customer;
        } else {
            customers.push(customer);
        }
        localStorage.setItem('customers', JSON.stringify({ timestamp: Date.now(), data: customers }));
    },

    // --- Optimistic Updates ---
    updateCustomerBalance: async (userId, amountToAdd) => {
        try {
            await ensureDB();
            await IDB.updateCustomerBalance(userId, amountToAdd);

            // Update localStorage cache
            const customers = OfflineStorage.loadData('customers') || [];
            const updated = customers.map(c => {
                if (c.unique_id === userId || c._id === userId) {
                    return { ...c, balance: (c.balance || 0) + amountToAdd };
                }
                return c;
            });
            localStorage.setItem('customers', JSON.stringify({ timestamp: Date.now(), data: updated }));
            return true;
        } catch (e) {
            console.error("Failed to update local customer balance", e);
            return false;
        }
    },

    // --- Order Operations ---
    addOrderLocal: async (order) => {
        try {
            await ensureDB();
            const orderData = {
                ...order,
                syncStatus: 'pending',
                localCreatedAt: new Date().toISOString()
            };
            const localId = await IDB.saveOrder(orderData);

            // Also update localStorage for immediate access
            const orders = OfflineStorage.loadData('orders') || [];
            orders.unshift({
                ...orderData,
                localId,
                _id: 'temp_' + Date.now(),
                createdAt: new Date().toISOString()
            });
            localStorage.setItem('orders', JSON.stringify({ timestamp: Date.now(), data: orders }));

            return localId;
        } catch (e) {
            console.error("Failed to add local order", e);
            return null;
        }
    },

    getPendingOrders: async () => {
        await ensureDB();
        return IDB.getPendingOrders();
    },

    markOrderSynced: async (localId, serverData) => {
        await ensureDB();
        return IDB.markOrderSynced(localId, serverData);
    },

    // --- Request Queue (Write Operations) ---
    queueRequest: (request) => {
        // Keep localStorage queue for backward compatibility with SyncManager
        const queue = OfflineStorage.getQueue();
        const newRequest = {
            id: Date.now() + Math.random().toString(36).substr(2, 9),
            timestamp: Date.now(),
            ...request
        };
        queue.push(newRequest);
        localStorage.setItem('offline_queue', JSON.stringify(queue));

        // Also add to IndexedDB queue
        ensureDB().then(() => {
            IDB.addToSyncQueue(request.type || 'api', request);
        });

        return newRequest.id;
    },

    getQueue: () => {
        try {
            const queue = localStorage.getItem('offline_queue');
            return queue ? JSON.parse(queue) : [];
        } catch (e) {
            return [];
        }
    },

    removeFromQueue: (id) => {
        const queue = OfflineStorage.getQueue();
        const newQueue = queue.filter(req => req.id !== id);
        localStorage.setItem('offline_queue', JSON.stringify(newQueue));
    },

    clearQueue: () => {
        localStorage.removeItem('offline_queue');
        ensureDB().then(() => IDB.clearSyncQueue());
    },

    // --- Sync Status ---
    getPendingSyncCount: async () => {
        await ensureDB();
        return IDB.getPendingSyncCount();
    },

    getLastSyncTime: async () => {
        await ensureDB();
        return IDB.getLastSyncTime();
    },

    setLastSyncTime: async () => {
        await ensureDB();
        return IDB.setLastSyncTime();
    },

    // --- Full Reset ---
    clearAllData: async () => {
        localStorage.removeItem('customers');
        localStorage.removeItem('orders');
        localStorage.removeItem('menu');
        localStorage.removeItem('offline_queue');
        await ensureDB();
        await IDB.clearAllData();
    }
};
