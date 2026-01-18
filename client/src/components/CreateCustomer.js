import React, { useState } from 'react';
import axios from 'axios';
import API_URL from '../config/api';
import './CreateCustomer.css';

const CreateCustomer = ({ scannedId, onCustomerCreated, onCancel }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const customerData = {
        unique_id: scannedId,
        name: name.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null
      };

      const response = await axios.post(`${API_URL}/api/customer`, customerData);
      
      // Customer created successfully, pass data to parent
      onCustomerCreated(scannedId, response.data);
    } catch (err) {
      if (err.response?.status === 409) {
        setError('Customer with this ID already exists. Please try scanning again.');
      } else {
        setError(err.response?.data?.error || 'Error creating customer. Please try again.');
      }
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-customer-overlay">
      <div className="create-customer-card card">
        <h2>Customer Not Found</h2>
        <p className="create-customer-message">
          Customer with ID <strong>"{scannedId}"</strong> was not found in the database.
          Please create a new customer to continue.
        </p>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="create-customer-form">
          <div className="form-group">
            <label htmlFor="uniqueId">Unique ID</label>
            <input
              type="text"
              id="uniqueId"
              value={scannedId}
              disabled
              className="disabled-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter customer name (optional)"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email (optional)"
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone">Phone</label>
            <input
              type="tel"
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Enter phone number (optional)"
            />
          </div>

          <div className="button-group">
            <button type="submit" className="button" disabled={loading}>
              {loading ? 'Creating...' : 'Create Customer & Continue'}
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
