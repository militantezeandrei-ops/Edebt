const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  customer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  customer_unique_id: {
    type: String,
    required: true,
    trim: true
  },
  order_name: {
    type: String,
    required: true,
    trim: true
  },
  order_description: {
    type: String,
    trim: true
  },
  order_amount: {
    type: Number
  },
  order_status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'cancelled'],
    default: 'pending'
  },
  is_scanned: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true // This adds createdAt and updatedAt fields
});

// Create indexes for faster queries
orderSchema.index({ customer_unique_id: 1 });
orderSchema.index({ customer_id: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ createdAt: -1, order_status: 1 }); // Compound index for reports

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
