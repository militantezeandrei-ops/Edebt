import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import axios from 'axios';
import API_URL from '../config/api';
import './OrderSelection.css';
import { OfflineStorage } from '../utils/offlineStorage';
import * as IDB from '../utils/indexedDB';

const OrderSelection = ({ customerId, initialCustomer, onOrderSaved, onBack }) => {
  const [customerInfo, setCustomerInfo] = useState(initialCustomer || null);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);

  // Online State
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleStatusChange = () => {
      setIsOnline(navigator.onLine);
    };
    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);
    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
    };
  }, []);

  // Pre-populate cart with items from handwritten capture (if any)
  useEffect(() => {
    if (initialCustomer?.capturedItems && initialCustomer.capturedItems.length > 0) {
      const prefilledCart = initialCustomer.capturedItems.map((item, index) => ({
        tempId: Date.now() + index,
        name: item.validatedName || item.originalName,
        price: item.validatedPrice || 0,
        description: 'From handwritten capture'
      }));
      setCart(prefilledCart);
    }
  }, [initialCustomer]);

  // Auto-save effect for new customers with items
  useEffect(() => {
    if (initialCustomer?.shouldAutoSave && cart.length > 0 && !loading) {
      console.log("Auto-saving order for new customer...");
      handleCheckout();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart, initialCustomer, loading]);

  // Fetch customer info if not provided
  useEffect(() => {
    if (!initialCustomer) {
      fetchCustomer();
    }
  }, [customerId, initialCustomer]);

  const fetchCustomer = async () => {
    // CACHE-FIRST: Try IndexedDB first
    try {
      const cachedCustomer = await IDB.getCustomer(customerId);
      if (cachedCustomer) {
        setCustomerInfo(cachedCustomer);
      } else {
        const customers = OfflineStorage.loadData('customers') || [];
        const found = customers.find(c => c.unique_id === customerId || c._id === customerId);
        if (found) setCustomerInfo(found);
      }
    } catch (e) {
      console.error('Error loading cached customer:', e);
    }

    // THEN: Update from network if online
    if (navigator.onLine) {
      try {
        const res = await axios.get(`${API_URL}/api/customer/${customerId}`);
        setCustomerInfo(res.data);
        await IDB.saveCustomer(res.data);
      } catch (err) {
        console.log('[OrderSelection] Could not update customer from server:', err.message);
      }
    }
  };

  const removeFromCart = (tempId) => {
    setCart(cart.filter(item => item.tempId !== tempId));
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setLoading(true);

    const totalAmount = cart.reduce((sum, item) => sum + item.price, 0);
    const orderRequests = cart.map(item => ({
      customer_unique_id: customerId,
      order_name: item.name,
      order_description: item.description,
      order_amount: item.price,
      order_status: 'pending'
    }));

    // 1. OPTIMISTIC UPDATE - Update local customer balance immediately
    await OfflineStorage.updateCustomerBalance(customerId, totalAmount);

    // 2. ATTEMPT SERVER SYNC FIRST (using batch endpoint for better performance)
    let synced = false;
    if (navigator.onLine) {
      try {
        // Use batch endpoint instead of individual requests
        await axios.post(`${API_URL}/api/orders/batch`, { orders: orderRequests });
        synced = true;
        console.log('[OrderSelection] Orders synced to server successfully (batch)');
      } catch (e) {
        console.log('[OrderSelection] Server sync failed:', e.message);
        synced = false;
      }
    }

    // 3. ONLY save to IndexedDB if NOT synced (prevents duplicates)
    if (!synced) {
      console.log('[OrderSelection] Saving orders to IndexedDB for later sync');
      for (const item of cart) {
        await IDB.saveOrder({
          customer_unique_id: customerId,
          order_name: item.name,
          order_description: item.description || '',
          order_amount: item.price,
          order_status: 'pending',
          syncStatus: 'pending'
        });
      }
    }

    // 4. UI FEEDBACK
    Swal.fire({
      icon: synced ? 'success' : 'info',
      title: synced ? 'Order Confirmed!' : 'Order Saved Offline',
      html: `
        <div style="text-align: center;">
          <p style="font-size: 1.2rem; font-weight: 600;">Total: ₱${totalAmount.toFixed(2)}</p>
          <p style="color: #6b7280; font-size: 0.9rem;">${cart.length} item(s)</p>
          <p style="margin-top: 8px; color: ${synced ? '#10b981' : '#f59e0b'};">
            ${synced ? '✓ Synced with server' : '⏳ Will sync when online'}
          </p>
        </div>
      `,
      timer: 2500,
      showConfirmButton: false
    });

    setCart([]);
    setLoading(false);

    // Update local state
    if (customerInfo) {
      setCustomerInfo(prev => ({
        ...prev,
        balance: (prev.balance || 0) + totalAmount
      }));
    }

    // Navigate back after short delay
    setTimeout(() => {
      if (onOrderSaved) onOrderSaved();
    }, 2500);
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price, 0);

  return (
    <div className="pos-container">
      {/* HEADER with customer info and back button */}
      <div className="order-header">
        <button className="back-btn" onClick={onBack}>
          ← Back
        </button>
        {customerInfo && (
          <div className="customer-info-header">
            <span className="customer-name">{customerInfo.name || customerInfo.unique_id}</span>
            <span className={`customer-balance ${customerInfo.balance > 0 ? 'debt' : 'credit'}`}>
              Balance: ₱{(customerInfo.balance || 0).toFixed(2)}
            </span>
          </div>
        )}
        {!isOnline && (
          <span className="offline-badge">📴 Offline</span>
        )}
      </div>

      {/* MAIN CONTENT */}
      <div className="order-content centered-content">
        {/* Manual entry removed as requested */}

        {/* Cart */}
        <div className="cart-section full-width">
          <h3>🛒 Order Summary</h3>

          <div className="cart-list">
            {cart.length === 0 ? (
              <div className="empty-cart">
                <span className="empty-icon">📋</span>
                <p>No items added yet</p>
                <p className="empty-hint">Add items using the form on the left</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.tempId} className="cart-item">
                  <div className="cart-item-info">
                    <span className="cart-item-name">{item.name}</span>
                    <span className="cart-item-price">₱{item.price.toFixed(2)}</span>
                  </div>
                  <button
                    className="remove-btn"
                    onClick={() => removeFromCart(item.tempId)}
                    title="Remove item"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Cart Footer */}
          <div className="cart-footer">
            <div className="cart-summary">
              <div className="summary-row">
                <span>Items:</span>
                <span>{cart.length}</span>
              </div>
              <div className="summary-row total">
                <span>Total:</span>
                <span>₱{cartTotal.toFixed(2)}</span>
              </div>
            </div>

            <button
              className="checkout-btn"
              disabled={cart.length === 0 || loading}
              onClick={handleCheckout}
            >
              {loading ? (
                <>⏳ Processing...</>
              ) : (
                <>✓ Confirm Order</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderSelection;
