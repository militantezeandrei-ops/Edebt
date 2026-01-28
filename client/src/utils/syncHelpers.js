import axios from 'axios';
import API_URL from '../config/api';
import { OfflineStorage } from './offlineStorage';
import * as IDB from './indexedDB';

// Full sync from server to local storage
export const syncDataDown = async () => {
    if (!navigator.onLine) return false;

    console.log("[Sync] Starting full data download...");

    try {
        // Initialize IndexedDB
        await IDB.initDB();

        // Get pending orders BEFORE sync to calculate local balance adjustments
        const pendingOrders = await IDB.getPendingOrders();
        const pendingBalanceByCustomer = {};
        pendingOrders.forEach(order => {
            const id = order.customer_unique_id;
            pendingBalanceByCustomer[id] = (pendingBalanceByCustomer[id] || 0) + (order.order_amount || 0);
        });
        console.log("[Sync] Pending balance adjustments:", pendingBalanceByCustomer);

        // 1. Fetch and save Customers (preserving pending balance)
        try {
            const customersRes = await axios.get(`${API_URL}/api/customers`);
            if (customersRes.data && customersRes.data.length > 0) {
                // Add pending balance to each customer
                const customersWithPending = customersRes.data.map(c => ({
                    ...c,
                    balance: (c.balance || 0) + (pendingBalanceByCustomer[c.unique_id] || 0)
                }));
                await IDB.saveCustomers(customersWithPending);
                OfflineStorage.saveData('customers', customersWithPending);
                console.log("[Sync] Customers synced:", customersRes.data.length);
            }
        } catch (e) {
            console.error("[Sync] Failed to sync customers:", e.message);
            return false; // Server error - don't continue
        }

        // 2. Fetch and save Menu
        try {
            const menuRes = await axios.get(`${API_URL}/api/menu`);
            if (menuRes.data && menuRes.data.length > 0) {
                await IDB.saveMenuItems(menuRes.data);
                OfflineStorage.saveData('menu', menuRes.data);
                console.log("[Sync] Menu synced:", menuRes.data.length);
            }
        } catch (e) {
            console.error("[Sync] Failed to sync menu:", e.message);
        }

        // 3. Fetch and save Orders
        try {
            const ordersRes = await axios.get(`${API_URL}/api/orders`);
            if (ordersRes.data) {
                OfflineStorage.saveData('orders', ordersRes.data);
                console.log("[Sync] Orders synced:", ordersRes.data.length);
            }
        } catch (e) {
            console.error("[Sync] Failed to sync orders:", e.message);
        }

        // Update last sync time
        await OfflineStorage.setLastSyncTime();

        return true;
    } catch (error) {
        console.error("[Sync] Full sync failed:", error);
        return false;
    }
};

// Upload pending data to server
export const syncDataUp = async () => {
    if (!navigator.onLine) return { success: false, uploaded: 0 };

    console.log("[Sync] Starting upload of pending data...");

    let uploadedOrders = 0;
    let uploadedCustomers = 0;
    let failedItems = [];

    try {
        await IDB.initDB();

        // 1. Upload pending customers
        const pendingCustomers = await IDB.getPendingCustomers();
        console.log("[Sync] Pending customers to upload:", pendingCustomers.length);

        for (const customer of pendingCustomers) {
            try {
                const response = await axios.post(`${API_URL}/api/customer`, {
                    unique_id: customer.unique_id,
                    name: customer.name,
                    email: customer.email,
                    phone: customer.phone
                });

                // Mark as synced with server data
                await IDB.markCustomerSynced(customer.unique_id, response.data);
                uploadedCustomers++;
                console.log("[Sync] Uploaded customer:", customer.unique_id);
            } catch (e) {
                if (e.response?.status === 409) {
                    // Customer already exists - mark as synced anyway
                    await IDB.markCustomerSynced(customer.unique_id, { syncStatus: 'synced' });
                    console.log("[Sync] Customer already exists, marked synced:", customer.unique_id);
                } else {
                    console.error("[Sync] Failed to upload customer:", customer.unique_id, e.message);
                    failedItems.push({ type: 'customer', id: customer.unique_id, error: e.message });
                }
            }
        }

        // 2. Upload pending orders from IndexedDB
        const pendingOrders = await IDB.getPendingOrders();
        console.log("[Sync] Pending orders to upload:", pendingOrders.length);

        for (const order of pendingOrders) {
            try {
                await axios.post(`${API_URL}/api/order`, {
                    customer_unique_id: order.customer_unique_id,
                    order_name: order.order_name,
                    order_description: order.order_description,
                    order_amount: order.order_amount,
                    order_status: order.order_status || 'pending'
                });

                // DELETE the order from IndexedDB after successful upload (not just mark)
                // This prevents duplicates on next sync
                await IDB.deleteOrder(order.localId);
                uploadedOrders++;
                console.log("[Sync] Uploaded and deleted local order:", order.localId);
            } catch (e) {
                console.error("[Sync] Failed to upload order:", order.localId, e.message);
                failedItems.push({ type: 'order', id: order.localId, error: e.message });
            }
        }

        // 3. Clear the legacy localStorage queue
        const queue = OfflineStorage.getQueue();
        console.log("[Sync] Legacy queue items:", queue.length);

        // Clear ALL queued items since we're handling orders through IndexedDB now
        OfflineStorage.clearQueue();
        console.log("[Sync] Cleared legacy queue");

        console.log(`[Sync] Upload complete. Orders: ${uploadedOrders}, Customers: ${uploadedCustomers}`);

        return {
            success: true,
            uploaded: uploadedOrders + uploadedCustomers,
            failed: failedItems.length,
            details: { orders: uploadedOrders, customers: uploadedCustomers, failures: failedItems }
        };
    } catch (error) {
        console.error("[Sync] Upload failed:", error);
        return { success: false, uploaded: 0, error: error.message };
    }
};

// Full bidirectional sync
export const fullSync = async () => {
    if (!navigator.onLine) return { success: false, reason: 'offline' };

    console.log("[Sync] Starting full bidirectional sync...");

    // First upload pending changes
    const uploadResult = await syncDataUp();

    // Then download latest data (only if upload succeeded or partially succeeded)
    let downloadSuccess = false;
    if (uploadResult.success || uploadResult.uploaded > 0) {
        downloadSuccess = await syncDataDown();
    }

    return {
        success: uploadResult.success && downloadSuccess,
        uploaded: uploadResult.uploaded,
        downloaded: downloadSuccess
    };
};

// Get sync status
export const getSyncStatus = async () => {
    const pendingCount = await OfflineStorage.getPendingSyncCount();
    const lastSync = await OfflineStorage.getLastSyncTime();

    return {
        pendingCount,
        lastSync,
        isOnline: navigator.onLine
    };
};

// Check if server is actually reachable (not just navigator.onLine)
export const isServerReachable = async () => {
    if (!navigator.onLine) return false;

    try {
        const response = await axios.get(`${API_URL}/api/health`, { timeout: 5000 });
        return response.status === 200;
    } catch {
        return false;
    }
};
