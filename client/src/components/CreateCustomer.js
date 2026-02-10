import React, { useState } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import API_URL from '../config/api';
import './CreateCustomer.css';
import { OfflineStorage } from '../utils/offlineStorage';
import * as IDB from '../utils/indexedDB';

const CreateCustomer = ({ scannedId, onCustomerCreated, onCancel }) => {
  // scannedId here is actually the Name extracted from OCR in the "Customer Not Found" flow
  const [name, setName] = useState(scannedId || '');

  const [generatedId, setGeneratedId] = useState(() => {
    return 'C-' + Date.now().toString().slice(-6) + Math.floor(Math.random() * 1000);
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const customerData = {
      unique_id: generatedId,
      name: name.trim() || null,
      balance: 0
    };

    // Check if online - try server first
    if (isOnline) {
      try {
        const response = await axios.post(`${API_URL}/api/customer`, customerData);

        // Save to local storage for offline access
        await IDB.saveCustomer({ ...response.data, syncStatus: 'synced' });
        await OfflineStorage.saveCustomer(response.data);

        // Customer created successfully, pass data to parent
        // IMPORTANT: Pass response.data.unique_id as the ID, not scannedId (which is the name)
        onCustomerCreated(response.data.unique_id, response.data);
        return;
      } catch (err) {
        if (err.response?.status === 409) {
          setError('Customer with this ID already exists. Please try scanning again.');
          setLoading(false);
          return;
        }
        // Network error, fall through to offline creation
        console.log('Online creation failed, creating offline:', err);
      }
    }

    // Offline creation
    try {
      const offlineCustomer = {
        ...customerData,
        _id: 'temp_' + scannedId + '_' + Date.now(),
        syncStatus: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Save to IndexedDB
      await IDB.saveCustomer(offlineCustomer);
      await OfflineStorage.saveCustomer(offlineCustomer);

      // Queue for sync
      OfflineStorage.queueRequest({
        type: 'customer',
        url: `${API_URL}/api/customer`,
        method: 'POST',
        body: customerData
      });

      // Show offline saved toast
      Swal.mixin({
        toast: true,
        position: 'center',
        showConfirmButton: false,
        timer: 2000
      }).fire({
        icon: 'info',
        title: 'Customer Saved Offline',
        text: 'Will sync when online'
      });

      // Continue with the offline customer data
      onCustomerCreated(scannedId, offlineCustomer);
    } catch (err) {
      console.error('Error saving offline customer:', err);
      setError('Failed to save customer locally. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-customer-overlay">
      <div className="create-customer-card card">
        <h2>Create New Customer</h2>
        <p className="create-customer-message">
          We found the name <strong>"{scannedId}"</strong> but no existing record.
          {!isOnline && <span className="offline-badge"> (Offline Mode)</span>}
        </p>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="create-customer-form">
          <div className="form-group">
            <label htmlFor="uniqueId">Auto-Generated ID</label>
            <input
              type="text"
              id="uniqueId"
              value={generatedId}
              disabled
              className="disabled-input"
            />
            <small className="field-hint">System generated unique ID</small>
          </div>

          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter customer name"
            />
          </div>

          <div className="button-group">
            <button type="submit" className="button" disabled={loading}>
              {loading ? 'Creating...' : (isOnline ? 'Create Customer & Continue' : 'Save Offline & Continue')}
            </button>
            <button type="button" className="button button-secondary" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateCustomer;
