// IndexedDB wrapper for offline-first data storage
const DB_NAME = 'e-debt-db';
const DB_VERSION = 1;

let db = null;

// Store names
const STORES = {
    CUSTOMERS: 'customers',
    ORDERS: 'orders',
    MENU: 'menu',
    PENDING_SYNC: 'pendingSync',
    META: 'meta'
};

// Initialize the database
export const initDB = () => {
    return new Promise((resolve, reject) => {
        if (db) {
            resolve(db);
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            console.error('IndexedDB error:', event.target.error);
            reject(event.target.error);
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            console.log('IndexedDB initialized successfully');
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const database = event.target.result;

            // Customers store
            if (!database.objectStoreNames.contains(STORES.CUSTOMERS)) {
                const customerStore = database.createObjectStore(STORES.CUSTOMERS, { keyPath: 'unique_id' });
                customerStore.createIndex('_id', '_id', { unique: false });
                customerStore.createIndex('syncStatus', 'syncStatus', { unique: false });
                customerStore.createIndex('updatedAt', 'updatedAt', { unique: false });
            }

            // Orders store
            if (!database.objectStoreNames.contains(STORES.ORDERS)) {
                const orderStore = database.createObjectStore(STORES.ORDERS, { keyPath: 'localId', autoIncrement: true });
                orderStore.createIndex('_id', '_id', { unique: false });
                orderStore.createIndex('customer_unique_id', 'customer_unique_id', { unique: false });
                orderStore.createIndex('syncStatus', 'syncStatus', { unique: false });
                orderStore.createIndex('createdAt', 'createdAt', { unique: false });
            }

            // Menu store
            if (!database.objectStoreNames.contains(STORES.MENU)) {
                const menuStore = database.createObjectStore(STORES.MENU, { keyPath: '_id' });
                menuStore.createIndex('category', 'category', { unique: false });
                menuStore.createIndex('is_available', 'is_available', { unique: false });
            }

            // Pending sync queue
            if (!database.objectStoreNames.contains(STORES.PENDING_SYNC)) {
                const syncStore = database.createObjectStore(STORES.PENDING_SYNC, { keyPath: 'id', autoIncrement: true });
                syncStore.createIndex('type', 'type', { unique: false });
                syncStore.createIndex('timestamp', 'timestamp', { unique: false });
            }

            // Meta store for sync timestamps etc
            if (!database.objectStoreNames.contains(STORES.META)) {
                database.createObjectStore(STORES.META, { keyPath: 'key' });
            }
        };
    });
};

// Get database instance
const getDB = async () => {
    if (!db) {
        await initDB();
    }
    return db;
};

// Generic CRUD operations
const dbOperation = async (storeName, mode, operation) => {
    const database = await getDB();
    return new Promise((resolve, reject) => {
        const transaction = database.transaction(storeName, mode);
        const store = transaction.objectStore(storeName);

        const request = operation(store);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

// ============== CUSTOMERS ==============

export const saveCustomer = async (customer) => {
    const data = {
        ...customer,
        syncStatus: customer.syncStatus || 'synced',
        localUpdatedAt: new Date().toISOString()
    };
    return dbOperation(STORES.CUSTOMERS, 'readwrite', (store) => store.put(data));
};

export const saveCustomers = async (customers) => {
    const database = await getDB();
    return new Promise((resolve, reject) => {
        const transaction = database.transaction(STORES.CUSTOMERS, 'readwrite');
        const store = transaction.objectStore(STORES.CUSTOMERS);

        customers.forEach(customer => {
            store.put({
                ...customer,
                syncStatus: 'synced',
                localUpdatedAt: new Date().toISOString()
            });
        });

        transaction.oncomplete = () => resolve(true);
        transaction.onerror = () => reject(transaction.error);
    });
};

export const getCustomer = async (uniqueId) => {
    return dbOperation(STORES.CUSTOMERS, 'readonly', (store) => store.get(uniqueId));
};

export const getAllCustomers = async () => {
    return dbOperation(STORES.CUSTOMERS, 'readonly', (store) => store.getAll());
};

export const getPendingCustomers = async () => {
    const database = await getDB();
    return new Promise((resolve, reject) => {
        const transaction = database.transaction(STORES.CUSTOMERS, 'readonly');
        const store = transaction.objectStore(STORES.CUSTOMERS);
        const index = store.index('syncStatus');
        const request = index.getAll('pending');

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

export const updateCustomerBalance = async (uniqueId, amountToAdd) => {
    const customer = await getCustomer(uniqueId);
    if (customer) {
        customer.balance = (customer.balance || 0) + amountToAdd;
        customer.localUpdatedAt = new Date().toISOString();
        // Don't change syncStatus - the order will be synced, not the balance directly
        return saveCustomer(customer);
    }
    return null;
};

export const markCustomerSynced = async (uniqueId, serverData) => {
    const customer = await getCustomer(uniqueId);
    if (customer) {
        const merged = { ...customer, ...serverData, syncStatus: 'synced' };
        return saveCustomer(merged);
    }
    return null;
};

// ============== ORDERS ==============

export const saveOrder = async (order) => {
    const data = {
        ...order,
        syncStatus: order.syncStatus || 'pending',
        localCreatedAt: order.localCreatedAt || new Date().toISOString()
    };
    return dbOperation(STORES.ORDERS, 'readwrite', (store) => store.put(data));
};

export const saveOrders = async (orders) => {
    const database = await getDB();
    return new Promise((resolve, reject) => {
        const transaction = database.transaction(STORES.ORDERS, 'readwrite');
        const store = transaction.objectStore(STORES.ORDERS);

        orders.forEach(order => {
            // For server orders, use _id as unique key context
            const existing = order._id ? { ...order, syncStatus: 'synced' } : order;
            store.put({
                ...existing,
                localCreatedAt: order.createdAt || new Date().toISOString()
            });
        });

        transaction.oncomplete = () => resolve(true);
        transaction.onerror = () => reject(transaction.error);
    });
};

export const getAllOrders = async () => {
    return dbOperation(STORES.ORDERS, 'readonly', (store) => store.getAll());
};

export const getOrdersByCustomer = async (customerUniqueId) => {
    const database = await getDB();
    return new Promise((resolve, reject) => {
        const transaction = database.transaction(STORES.ORDERS, 'readonly');
        const store = transaction.objectStore(STORES.ORDERS);
        const index = store.index('customer_unique_id');
        const request = index.getAll(customerUniqueId);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

export const getPendingOrders = async () => {
    const database = await getDB();
    return new Promise((resolve, reject) => {
        const transaction = database.transaction(STORES.ORDERS, 'readonly');
        const store = transaction.objectStore(STORES.ORDERS);
        const index = store.index('syncStatus');
        const request = index.getAll('pending');

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

export const markOrderSynced = async (localId, serverData) => {
    const database = await getDB();
    return new Promise((resolve, reject) => {
        const transaction = database.transaction(STORES.ORDERS, 'readwrite');
        const store = transaction.objectStore(STORES.ORDERS);
        const getRequest = store.get(localId);

        getRequest.onsuccess = () => {
            const order = getRequest.result;
            if (order) {
                const updated = { ...order, ...serverData, syncStatus: 'synced' };
                store.put(updated);
                resolve(updated);
            } else {
                resolve(null);
            }
        };
        getRequest.onerror = () => reject(getRequest.error);
    });
};

export const deleteOrder = async (localId) => {
    return dbOperation(STORES.ORDERS, 'readwrite', (store) => store.delete(localId));
};

// ============== MENU ==============

export const saveMenuItem = async (item) => {
    return dbOperation(STORES.MENU, 'readwrite', (store) => store.put(item));
};

export const saveMenuItems = async (items) => {
    const database = await getDB();
    return new Promise((resolve, reject) => {
        const transaction = database.transaction(STORES.MENU, 'readwrite');
        const store = transaction.objectStore(STORES.MENU);

        // Clear existing and add new
        store.clear();
        items.forEach(item => store.put(item));

        transaction.oncomplete = () => resolve(true);
        transaction.onerror = () => reject(transaction.error);
    });
};

export const getAllMenuItems = async () => {
    return dbOperation(STORES.MENU, 'readonly', (store) => store.getAll());
};

export const getAvailableMenuItems = async () => {
    const items = await getAllMenuItems();
    return items.filter(item => item.is_available !== false);
};

// ============== PENDING SYNC QUEUE ==============

export const addToSyncQueue = async (type, data) => {
    const item = {
        type, // 'order', 'customer', 'menu'
        data,
        timestamp: new Date().toISOString(),
        attempts: 0
    };
    return dbOperation(STORES.PENDING_SYNC, 'readwrite', (store) => store.add(item));
};

export const getSyncQueue = async () => {
    return dbOperation(STORES.PENDING_SYNC, 'readonly', (store) => store.getAll());
};

export const removeFromSyncQueue = async (id) => {
    return dbOperation(STORES.PENDING_SYNC, 'readwrite', (store) => store.delete(id));
};

export const clearSyncQueue = async () => {
    return dbOperation(STORES.PENDING_SYNC, 'readwrite', (store) => store.clear());
};

export const incrementSyncAttempt = async (id) => {
    const database = await getDB();
    return new Promise((resolve, reject) => {
        const transaction = database.transaction(STORES.PENDING_SYNC, 'readwrite');
        const store = transaction.objectStore(STORES.PENDING_SYNC);
        const getRequest = store.get(id);

        getRequest.onsuccess = () => {
            const item = getRequest.result;
            if (item) {
                item.attempts = (item.attempts || 0) + 1;
                item.lastAttempt = new Date().toISOString();
                store.put(item);
                resolve(item);
            } else {
                resolve(null);
            }
        };
        getRequest.onerror = () => reject(getRequest.error);
    });
};

// ============== META ==============

export const setMeta = async (key, value) => {
    return dbOperation(STORES.META, 'readwrite', (store) =>
        store.put({ key, value, updatedAt: new Date().toISOString() })
    );
};

export const getMeta = async (key) => {
    const result = await dbOperation(STORES.META, 'readonly', (store) => store.get(key));
    return result?.value;
};

export const getLastSyncTime = async () => {
    return getMeta('lastSyncTime');
};

export const setLastSyncTime = async () => {
    return setMeta('lastSyncTime', new Date().toISOString());
};

// ============== UTILITY ==============

export const clearAllData = async () => {
    const database = await getDB();
    return new Promise((resolve, reject) => {
        const storeNames = [STORES.CUSTOMERS, STORES.ORDERS, STORES.MENU, STORES.PENDING_SYNC];
        const transaction = database.transaction(storeNames, 'readwrite');

        storeNames.forEach(name => {
            transaction.objectStore(name).clear();
        });

        transaction.oncomplete = () => resolve(true);
        transaction.onerror = () => reject(transaction.error);
    });
};

export const getPendingSyncCount = async () => {
    const pendingOrders = await getPendingOrders();
    const pendingCustomers = await getPendingCustomers();
    const syncQueue = await getSyncQueue();
    return pendingOrders.length + pendingCustomers.length + syncQueue.length;
};

export { STORES };
