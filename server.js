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
const axios = require('axios');
const compression = require('compression');
const connectDB = require('./config/database');
const Customer = require('./models/Customer');
const Order = require('./models/Order');
const MenuItem = require('./models/MenuItem');
const User = require('./models/User');

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

// Enable gzip compression for all responses
app.use(compression());

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Performance monitoring middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (duration > 1000) {
      console.log(`⚠️ SLOW REQUEST: ${req.method} ${req.path} - ${duration}ms`);
    }
  });
  next();
});

// --- Role-based middleware ---
const requireRole = (...roles) => {
  return (req, res, next) => {
    const userRole = req.headers['x-user-role'];
    if (!userRole || !roles.includes(userRole)) {
      return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
    }
    next();
  };
};

// --- Auth Endpoints ---
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    const user = await User.findOne({ username: username.toLowerCase(), is_active: true });
    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get current user list (admin only)
app.get('/api/auth/users', requireRole('admin'), async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ role: 1, username: 1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Temporary Debug Endpoint (Remove after fixing login)
app.get('/api/debug/users', async (req, res) => {
  try {
    const users = await User.find({}).select('username role');
    res.json({ count: users.length, users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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

    // Check if customer already exists (by ID) -- KEEP THIS for explicit ID checks
    const existingCustomerById = await Customer.findOne({ unique_id });
    if (existingCustomerById) {
      // If ID exists, just return it (idempotent behavior)
      return res.json(existingCustomerById);
    }

    // NEW: Check if customer name already exists (case-insensitive) to prevent duplicates
    if (name) {
      // Escape regex characters just in case
      const safeName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const existingByName = await Customer.findOne({
        name: { $regex: new RegExp(`^${safeName}$`, 'i') }
      });

      if (existingByName) {
        console.log(`Prevented duplicate customer creation for: "${name}". Returning existing: ${existingByName.unique_id}`);
        return res.json(existingByName);
      }
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

// Get all customers
app.get('/api/customers', async (req, res) => {
  try {
    const filters = {};
    if (req.query.is_active) {
      filters.is_active = req.query.is_active === 'true';
    }

    const customers = await Customer.find(filters).sort({ name: 1 });
    res.json(customers);
  } catch (err) {
    console.error('Error fetching customers:', err);
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

    // Update customer balance and last transaction date using atomic operator
    // This prevents race conditions when multiple orders are placed simultaneously
    if (sanitizedAmount) {
      await Customer.findByIdAndUpdate(
        customer._id,
        {
          $inc: { balance: sanitizedAmount },
          $set: { last_transaction_date: new Date() }
        }
      );
    }

    // Populate customer info in response
    await savedOrder.populate('customer_id', 'name email');

    res.json(savedOrder);
  } catch (err) {
    console.error('Error creating order:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create multiple orders at once (BATCH ENDPOINT for performance)
app.post('/api/orders/batch', async (req, res) => {
  try {
    const { orders } = req.body;

    // Validate input
    if (!Array.isArray(orders) || orders.length === 0) {
      return res.status(400).json({ error: 'Orders array is required' });
    }

    // Validate all orders have required fields
    for (const order of orders) {
      if (!order.customer_unique_id || !order.order_name) {
        return res.status(400).json({
          error: 'Each order must have customer_unique_id and order_name'
        });
      }
    }

    // Get customer ID for the first order (all should be same customer)
    const customerUniqueId = orders[0].customer_unique_id;
    const customer = await Customer.findOne({ unique_id: customerUniqueId });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Prepare orders for batch insert
    const ordersToInsert = orders.map(orderData => ({
      customer_id: customer._id,
      customer_unique_id: customerUniqueId,
      order_name: orderData.order_name,
      order_description: orderData.order_description || '',
      order_amount: parseFloat(orderData.order_amount) || 0,
      order_status: orderData.order_status || 'pending'
    }));

    // Batch insert all orders
    const createdOrders = await Order.insertMany(ordersToInsert);

    // Calculate total amount and update customer balance atomically
    const totalAmount = ordersToInsert.reduce((sum, o) => sum + o.order_amount, 0);

    if (totalAmount > 0) {
      await Customer.findByIdAndUpdate(
        customer._id,
        {
          $inc: { balance: totalAmount },
          $set: { last_transaction_date: new Date() }
        }
      );
    }

    console.log(`✅ Batch created ${createdOrders.length} orders for ${customerUniqueId}`);

    res.status(201).json({
      success: true,
      count: createdOrders.length,
      totalAmount: totalAmount,
      orders: createdOrders
    });
  } catch (err) {
    console.error('Error creating batch orders:', err);
    res.status(500).json({ error: err.message });
  }
});

// --- Customer Update/Delete/Payment Endpoints (Admin only) ---

// Update customer
app.put('/api/customer/:id', requireRole('admin'), async (req, res) => {
  try {
    const { name, email, phone, balance, is_active } = req.body;
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (balance !== undefined) updateData.balance = parseFloat(balance);
    if (is_active !== undefined) updateData.is_active = is_active;

    const customer = await Customer.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json(customer);
  } catch (err) {
    console.error('Error updating customer:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete customer (admin only)
app.delete('/api/customer/:id', requireRole('admin'), async (req, res) => {
  try {
    // Also delete associated orders
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    await Order.deleteMany({ customer_id: customer._id });
    await Customer.findByIdAndDelete(req.params.id);

    res.json({ message: 'Customer and associated orders deleted' });
  } catch (err) {
    console.error('Error deleting customer:', err);
    res.status(500).json({ error: err.message });
  }
});

// Record a payment for a customer (admin only)
app.post('/api/customer/:id/payment', requireRole('admin'), async (req, res) => {
  try {
    const { amount, note } = req.body;
    const paymentAmount = parseFloat(amount);

    if (!paymentAmount || paymentAmount <= 0) {
      return res.status(400).json({ error: 'Valid payment amount is required' });
    }

    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    // Reduce balance by payment amount
    const newBalance = Math.max(0, customer.balance - paymentAmount);
    customer.balance = newBalance;
    customer.last_transaction_date = new Date();
    await customer.save();

    // Create a payment order record
    const paymentOrder = new Order({
      customer_id: customer._id,
      customer_unique_id: customer.unique_id,
      order_name: `Payment Received`,
      order_description: note || `Payment of ₱${paymentAmount.toFixed(2)}`,
      order_amount: -paymentAmount, // Negative to indicate payment
      order_status: 'completed'
    });
    await paymentOrder.save();

    res.json({
      success: true,
      customer,
      payment: paymentOrder,
      previousBalance: customer.balance + paymentAmount,
      newBalance: customer.balance
    });
  } catch (err) {
    console.error('Error recording payment:', err);
    res.status(500).json({ error: err.message });
  }
});

// --- Order Status Update ---
app.put('/api/order/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'processing', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { order_status: status },
      { new: true }
    ).populate('customer_id', 'name email');
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    console.error('Error updating order status:', err);
    res.status(500).json({ error: err.message });
  }
});

// --- Data Export Endpoints (Admin only) ---
app.get('/api/export/customers', requireRole('admin'), async (req, res) => {
  try {
    const customers = await Customer.find().sort({ name: 1 }).lean();
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/export/orders', requireRole('admin'), async (req, res) => {
  try {
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .populate('customer_id', 'name email unique_id')
      .lean();

    const formatted = orders.map(o => ({
      ...o,
      customer_name: o.customer_id?.name || 'Unknown',
      customer_email: o.customer_id?.email || '',
      customer_unique_id_ref: o.customer_id?.unique_id || o.customer_unique_id
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Menu Management Endpoints ---

// Get all menu items
app.get('/api/menu', async (req, res) => {
  try {
    const filters = {};
    // Optional: filter by category or availability if needed query params are present
    if (req.query.category) filters.category = req.query.category;
    if (req.query.available === 'true') filters.is_available = true;

    const menuItems = await MenuItem.find(filters).sort({ category: 1, name: 1 });
    res.json(menuItems);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create menu item
app.post('/api/menu', async (req, res) => {
  try {
    const { name, description, price, category, is_available } = req.body;
    const menuItem = new MenuItem({ name, description, price, category, is_available });
    await menuItem.save();
    res.json(menuItem);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update menu item
app.put('/api/menu/:id', async (req, res) => {
  try {
    const menuItem = await MenuItem.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!menuItem) return res.status(404).json({ error: 'Menu item not found' });
    res.json(menuItem);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete menu item
app.delete('/api/menu/:id', async (req, res) => {
  try {
    const result = await MenuItem.findByIdAndDelete(req.params.id);
    if (!result) return res.status(404).json({ error: 'Menu item not found' });
    res.json({ message: 'Menu item deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- AI Analytics Endpoints ---

app.get('/api/analytics', async (req, res) => {
  try {
    // 1. High Debt Customers
    const highDebtCustomers = await Customer.find({ balance: { $gt: 0 } })
      .sort({ balance: -1 })
      .limit(5)
      .select('name unique_id balance email');

    // 2. Most Popular Products (All Time)
    const activeProducts = await Order.aggregate([
      { $group: { _id: "$order_name", count: { $sum: 1 }, totalRevenue: { $sum: "$order_amount" } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    // 3. AI/Trend Insight: Trending Product (Last 7 Days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const trendingProducts = await Order.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      { $group: { _id: "$order_name", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 3 }
    ]);

    res.json({
      highDebtCustomers,
      popularProducts: activeProducts,
      trendingProducts,
      aiInsights: {
        totalDebt: highDebtCustomers.reduce((acc, curr) => acc + curr.balance, 0),
        topTrend: trendingProducts.length > 0 ? trendingProducts[0]._id : "Insufficient Data"
      }
    });
  } catch (err) {
    console.error('Error in analytics:', err);
    res.status(500).json({ error: err.message });
  }
});

// --- Reporting Endpoints ---

// Weekly Report (orders aggregated by day for last 7 days)
app.get('/api/reports/weekly', async (req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const report = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: "$order_amount" }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json(report);
  } catch (err) {
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

// Full System Reset
app.post('/api/reset', async (req, res) => {
  try {
    const { action } = req.body;

    // Safety check
    if (action !== 'FULL_RESET') {
      return res.status(400).json({ error: 'Invalid confirmation token.' });
    }

    console.log("!!! INITIATING FULL SYSTEM RESET !!!");

    // 1. Delete all orders
    await Order.deleteMany({});
    console.log("All orders deleted.");

    // 2. Delete all customers (Complete Wipe)
    await Customer.deleteMany({});
    console.log("All customers deleted.");

    res.json({ message: 'System reset successful. ALL DATA WIPED (Customers & Orders).' });

  } catch (err) {
    console.error('CRITICAL: Error during system reset:', err);
    res.status(500).json({ error: err.message });
  }
});

// --- OCR Processing Endpoint ---

// --- OCR Processing Endpoint (Gemini-2.5-Flash-Lite) ---

const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini
// Note: We're using the same key variable. Ensure this key has 'Generative Language API' enabled in Google Cloud.
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_VISION_API_KEY);

app.post('/api/ocr/process', async (req, res) => {
  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    // Extract base64 data
    const base64Image = image.includes(',') ? image.split(',')[1] : image;

    const apiKey = process.env.GOOGLE_VISION_API_KEY;
    if (!apiKey) {
      console.warn('API Key not set');
      return res.json({
        rawText: 'Mock Data',
        parsedOrder: { name: 'Mock User', items: [] },
        isMock: true
      });
    }

    const prompt = `
      Analyze this handwritten order slip image.
      The image may contain ONE or MULTIPLE distinct orders for different customers.
      
      Look for visual separators (lines, spacing, boxes) or distinct headers ("Name:", "Customer:") that indicate separate orders.
      If it's a single page with multiple sections for different people, treat them as separate orders.

      CRITICAL FOR NAME EXTRACTION:
      - Look specifically for text at the top of each block or labeled "Customer", "Name", "To", "Sold to", "Client", etc.
      - The name is often handwritten in cursive. Please interpret carefully.
      - If the name is ambiguous, prefer common Filipino names or English names.
      - If multiple names appear in a single block, choose the one that looks like the customer/recipient.

      Return ONLY a valid JSON object with this structure:
      {
        "parsedOrders": [
          {
            "name": "Customer Name (or empty string if not found)",
            "items": [
              { "originalName": "Item Name", "originalPrice": "Price (number or string)" }
            ]
          }
        ]
      }
      If the price is missing, use null.
      Do not include markdown formatting like \`\`\`json. Just the raw JSON string.
    `;

    const imagePart = {
      inlineData: {
        data: base64Image,
        mimeType: "image/jpeg",
      },
    };

    console.log('Calling Gemini API...');

    // Robust Model Fallback Logic
    const candidateModels = [
      "gemma-3-1b-it",    // Requested: Gemma 3 1B (Instruction Tuned)
      "gemma-3-1b",       // Requested: Gemma 3 1B Base
      "gemma-3-27b-it",   // Requested: Gemma 3 (Instruction Tuned)
      "gemma-3-27b",      // Requested: Gemma 3 Base
      "gemini-3-flash",   // Seen in screenshot
      "gemini-2.5-flash",
      "gemini-1.5-flash", // Workhorse fallback
      "gemini-1.5-flash-latest",
      "gemini-1.5-flash-001",
      "gemini-1.5-pro",
      "gemini-pro-vision"
    ];

    let result;
    let success = false;
    let lastError = null;

    for (const modelName of candidateModels) {
      try {
        console.log(`Attempting OCR with model: ${modelName}`);
        const model = genAI.getGenerativeModel({ model: modelName });

        // Retry logic for 503 errors (per model)
        let retries = 2;
        while (retries > 0) {
          try {
            result = await model.generateContent([prompt, imagePart]);
            success = true;
            break; // Break retry loop
          } catch (err) {
            if (err.message.includes('503') && retries > 1) {
              console.log(`Model ${modelName} overloaded. Retrying...`);
              retries--;
              await new Promise(r => setTimeout(r, 1500));
            } else {
              throw err; // Throw to outer loop to try next model
            }
          }
        }

        if (success) {
          console.log(`Successfully used model: ${modelName}`);
          break; // Break model loop
        }

      } catch (err) {
        console.warn(`Failed validation/generation with ${modelName}: ${err.message}`);
        lastError = err;
        // Continue to next model
      }
    }

    if (!success || !result) {
      throw new Error(`All OCR models failed. Last error: ${lastError?.message || 'Unknown'}`);
    }

    const response = await result.response;
    const text = response.text();

    console.log('Gemini Raw Response:', text);

    // Clean up response if it contains markdown code blocks
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();

    let parsedData;
    try {
      parsedData = JSON.parse(jsonStr);
      // Ensure structure is always uniform { parsedOrders: [] }
      if (!parsedData.parsedOrders && (parsedData.name || parsedData.items)) {
        // If legacy format returned (single object), wrap it
        parsedData = { parsedOrders: [parsedData] };
      } else if (Array.isArray(parsedData)) {
        // If array returned directly
        parsedData = { parsedOrders: parsedData };
      }
    } catch (e) {
      console.error("Failed to parse Gemini JSON:", e);
      // Fallback: try to construct somewhat valid data from text if JSON parsing fails
      parsedData = { parsedOrders: [{ name: "", items: [] }] };
    }

    res.json({
      rawText: text, // Sending full explanation as raw text for debugging
      parsedOrders: parsedData.parsedOrders,
      isMock: false
    });

  } catch (err) {
    console.error('OCR processing error:', err);
    // Return a clear error message
    res.status(500).json({
      error: 'AI Processing Failed: ' + (err.message || err.toString())
    });
  }
});

// Customer fuzzy search endpoint
app.get('/api/customers/search', async (req, res) => {
  try {
    const { name } = req.query;

    if (!name) {
      return res.status(400).json({ error: 'Name query parameter is required' });
    }

    // Get all customers and perform fuzzy matching
    const customers = await Customer.find({ is_active: true }).select('unique_id name email phone balance');

    const normalizedQuery = name.toLowerCase().trim();

    // Calculate similarity scores
    const scoredCustomers = customers.map(customer => {
      const customerName = (customer.name || '').toLowerCase();

      // Simple similarity check
      let score = 0;

      if (customerName === normalizedQuery) {
        score = 1.0;
      } else if (customerName.includes(normalizedQuery) || normalizedQuery.includes(customerName)) {
        score = 0.8;
      } else {
        // Levenshtein-like scoring
        const maxLen = Math.max(customerName.length, normalizedQuery.length);
        let matches = 0;
        for (let i = 0; i < Math.min(customerName.length, normalizedQuery.length); i++) {
          if (customerName[i] === normalizedQuery[i]) matches++;
        }
        score = matches / maxLen;
      }

      return { customer, score };
    });

    // Sort by score and return top matches
    const topMatches = scoredCustomers
      .filter(item => item.score > 0.3)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(item => ({
        ...item.customer.toObject(),
        confidence: item.score
      }));

    res.json(topMatches);

  } catch (err) {
    console.error('Customer search error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected' });
});

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  // Set static folder
  app.use(express.static('client/build'));

  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'client', 'build', 'index.html'));
  });
}

// Start server
const os = require('os');
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Server running locally on http://localhost:${PORT}`);

  // Find and log local IP for mobile access
  const interfaces = os.networkInterfaces();
  for (const name in interfaces) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        console.log(`📱 Access on your mobile network at: http://${iface.address}:${PORT}`);
      }
    }
  }
  console.log('---');
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
