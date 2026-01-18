import React from 'react';
import './CustomerInfo.css';

const CustomerInfo = ({ customer }) => {
  return (
    <div className="customer-info card">
      <h2>Customer Information</h2>
      <div className="customer-details">
        <div className="detail-row">
          <span className="detail-label">Unique ID:</span>
          <span className="detail-value">{customer.unique_id}</span>
        </div>
        {customer.name && (
          <div className="detail-row">
            <span className="detail-label">Name:</span>
            <span className="detail-value">{customer.name}</span>
          </div>
        )}
        {customer.email && (
          <div className="detail-row">
            <span className="detail-label">Email:</span>
            <span className="detail-value">{customer.email}</span>
          </div>
        )}
        {customer.phone && (
          <div className="detail-row">
            <span className="detail-label">Phone:</span>
            <span className="detail-value">{customer.phone}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerInfo;
