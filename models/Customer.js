const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  unique_id: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  name: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    trim: true
  },
  balance: {
    type: Number,
    default: 0
  },
  last_transaction_date: {
    type: Date
  },
  is_active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true // This adds createdAt and updatedAt fields
});

// Additional indexes for performance optimization
customerSchema.index({ name: 'text' }); // Text search index
customerSchema.index({ is_active: 1, balance: -1 }); // Compound index for filtering
customerSchema.index({ last_transaction_date: -1 }); // For sorting by recent activity

const Customer = mongoose.model('Customer', customerSchema);

module.exports = Customer;
