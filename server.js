// Load environment variables
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Verify environment variables are loaded
if (!process.env.MONGODB_URI) {
  console.error('ERROR: MONGODB_URI is not defined!');
  console.error('Please make sure .env file exists in the root directory with MONGODB_URI set.');
  process.exit(1);
}

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const connectDB = require('./config/database');
const Customer = require('./models/Customer');
const Order = require('./models/Order');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Middleware
// CORS configuration - allow all origins (or specify your Netlify domain)
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow localhost for development
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }
    
    // Allow Netlify domains
    if (origin.includes('netlify.app') || origin.includes('netlify.com')) {
      return callback(null, true);
    }
    
    // Allow Vercel domains
    if (origin.includes('vercel.app')) {
      return callback(null, true);
    }
    
    // For production, you can restrict to specific domains
    // For now, allow all origins
    callback(null, true);
  },
  credentials: true
};

app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// API Routes

// Get customer by unique ID
app.get('/api/customer/:uniqueId', async (req, res) => {
  try {
    const { uniqueId } = req.params;
    
    const customer = await Customer.findOne({ unique_id: uniqueId });
    
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    res.json(customer);
  } catch (err) {
    console.error('Error fetching customer:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create new customer
app.post('/api/customer', async (req, res) => {
  try {
    const { unique_id, name, email, phone } = req.body;
    
    if (!unique_id) {
      return res.status(400).json({ error: 'Unique ID is required' });
    }

    // Check if customer already exists
    const existingCustomer = await Customer.findOne({ unique_id });
    if (existingCustomer) {
      return res.status(409).json({ error: 'Customer with this unique ID already exists' });
    }

    const customer = new Customer({
      unique_id,
      name: name || undefined,
      email: email || undefined,
      phone: phone || undefined
    });

    const savedCustomer = await customer.save();
    res.json(savedCustomer);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Customer with this unique ID already exists' });
    }
    console.error('Error creating customer:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get all orders for a customer
app.get('/api/customer/:uniqueId/orders', async (req, res) => {
  try {
    const { uniqueId } = req.params;
    
    const orders = await Order.find({ customer_unique_id: uniqueId })
      .sort({ createdAt: -1 })
      .populate('customer_id', 'name email');
    
    res.json(orders);
  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create new order
app.post('/api/order', async (req, res) => {
  try {
    const { customer_unique_id, order_name, order_description, order_amount, order_status } = req.body;
    
    console.log('Received order request:', { customer_unique_id, order_name, order_description, order_amount, order_status });
    
    if (!customer_unique_id || !order_name) {
      return res.status(400).json({ error: 'Customer unique ID and order name are required' });
    }

    // Find customer by unique_id
    const customer = await Customer.findOne({ unique_id: customer_unique_id });
    
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Validate and sanitize order_amount
    let sanitizedAmount = null;
    if (order_amount !== null && order_amount !== undefined) {
      const amount = parseFloat(order_amount);
      if (!isNaN(amount) && amount >= 0) {
        sanitizedAmount = amount;
      }
    }

    // Create order
    const order = new Order({
      customer_id: customer._id,
      customer_unique_id,
      order_name,
      order_description: order_description || undefined,
      order_amount: sanitizedAmount,
      order_status: order_status || 'pending'
    });

    const savedOrder = await order.save();
    
    // Populate customer info in response
    await savedOrder.populate('customer_id', 'name email');
    
    res.json(savedOrder);
  } catch (err) {
    console.error('Error creating order:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get all orders
app.get('/api/orders', async (req, res) => {
  try {
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .populate('customer_id', 'name email');
    
    // Transform to match expected format
    const formattedOrders = orders.map(order => ({
      ...order.toObject(),
      customer_name: order.customer_id?.name,
      customer_email: order.customer_id?.email
    }));
    
    res.json(formattedOrders);
  } catch (err) {
    console.error('Error fetching all orders:', err);
    res.status(500).json({ error: err.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    process.exit(0);
  } catch (err) {
    console.error('Error closing database connection:', err);
    process.exit(1);
  }
});
