import React, { useState } from 'react';
import axios from 'axios';
import API_URL from '../config/api';
import './OrderSelection.css';

const OrderSelection = ({ customerId, onOrderSaved, onBack }) => {
  const [orderName, setOrderName] = useState('');
  const [orderDescription, setOrderDescription] = useState('');
  const [orderAmount, setOrderAmount] = useState('');
  const [orderStatus, setOrderStatus] = useState('pending');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [messageType, setMessageType] = useState(null);

  // Predefined order options
  const predefinedOrders = [
    { name: 'Pizza Margherita', description: 'Classic pizza with tomato and mozzarella', amount: 12.99 },
    { name: 'Burger Deluxe', description: 'Beef burger with fries', amount: 15.99 },
    { name: 'Pasta Carbonara', description: 'Creamy pasta with bacon', amount: 14.99 },
    { name: 'Caesar Salad', description: 'Fresh salad with chicken', amount: 10.99 },
    { name: 'Sushi Platter', description: 'Assorted sushi rolls', amount: 24.99 },
  ];

  const handlePredefinedOrder = (order) => {
    setOrderName(order.name);
    setOrderDescription(order.description);
    setOrderAmount(order.amount.toString());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!orderName.trim()) {
      setMessage('Please enter an order name');
      setMessageType('error');
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      // Parse order amount, handle empty strings and invalid values
      let parsedAmount = null;
      if (orderAmount && orderAmount.trim() !== '') {
        const amount = parseFloat(orderAmount);
        if (!isNaN(amount) && amount >= 0) {
          parsedAmount = amount;
        }
      }

      const orderData = {
        customer_unique_id: customerId,
        order_name: orderName,
        order_description: orderDescription || null,
        order_amount: parsedAmount,
        order_status: orderStatus
      };

      await axios.post(`${API_URL}/api/order`, orderData);
      
      setMessage('Order saved successfully!');
      setMessageType('success');
      
      // Reset form
      setOrderName('');
      setOrderDescription('');
      setOrderAmount('');
      setOrderStatus('pending');

      // Option to add another order or go back
      setTimeout(() => {
        if (window.confirm('Order saved! Would you like to add another order for this customer?')) {
          setMessage(null);
        } else {
          onOrderSaved();
        }
      }, 1500);

    } catch (err) {
      setMessage(err.response?.data?.error || 'Error saving order. Please try again.');
      setMessageType('error');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="order-selection card">
      <h2>Add Order</h2>
      
      {message && (
        <div className={messageType === 'success' ? 'success-message' : 'error-message'}>
          {message}
        </div>
      )}

      <div className="predefined-orders">
        <h3>Quick Select Orders</h3>
        <div className="order-buttons">
          {predefinedOrders.map((order, index) => (
            <button
              key={index}
              className="order-button"
              onClick={() => handlePredefinedOrder(order)}
            >
              <div className="order-button-name">{order.name}</div>
              <div className="order-button-price">${order.amount}</div>
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="order-form">
        <div className="form-group">
          <label htmlFor="orderName">Order Name *</label>
          <input
            type="text"
            id="orderName"
            value={orderName}
            onChange={(e) => setOrderName(e.target.value)}
            placeholder="Enter order name"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="orderDescription">Description</label>
          <textarea
            id="orderDescription"
            value={orderDescription}
            onChange={(e) => setOrderDescription(e.target.value)}
            placeholder="Enter order description (optional)"
            rows="3"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="orderAmount">Amount ($)</label>
            <input
              type="number"
              id="orderAmount"
              value={orderAmount}
              onChange={(e) => setOrderAmount(e.target.value)}
              placeholder="0.00"
              step="0.01"
              min="0"
            />
          </div>

          <div className="form-group">
            <label htmlFor="orderStatus">Status</label>
            <select
              id="orderStatus"
              value={orderStatus}
              onChange={(e) => setOrderStatus(e.target.value)}
            >
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <div className="button-group">
          <button type="submit" className="button" disabled={loading}>
            {loading ? 'Saving...' : 'Save Order'}
          </button>
          <button type="button" className="button button-secondary" onClick={onBack}>
            Back to Scanner
          </button>
        </div>
      </form>
    </div>
  );
};

export default OrderSelection;
