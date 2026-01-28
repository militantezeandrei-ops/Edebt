const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI;

    if (!mongoURI) {
      throw new Error('MONGODB_URI is not defined in environment variables. Please check your .env file.');
    }

    const conn = await mongoose.connect(mongoURI, {
      // Connection pooling for better performance with concurrent requests
      maxPoolSize: 10, // Maximum 10 concurrent connections
      minPoolSize: 2,  // Keep 2 connections warm
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 5000,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Initialize sample data if database is empty
    await initializeSampleData();

    return conn;
  } catch (error) {
    console.error('Error connecting to MongoDB:', error.message);
    process.exit(1);
  }
};

const initializeSampleData = async () => {
  try {
    const Customer = require('../models/Customer');

    // Check if sample customers already exist
    const existingCustomers = await Customer.countDocuments();

    if (existingCustomers === 0) {
      // Insert sample customers
      const sampleCustomers = [
        { unique_id: 'CUST001', name: 'John Doe', email: 'john@example.com', phone: '123-456-7890' },
        { unique_id: 'CUST002', name: 'Jane Smith', email: 'jane@example.com', phone: '098-765-4321' },
        { unique_id: 'CUST003', name: 'Bob Johnson', email: 'bob@example.com', phone: '555-123-4567' }
      ];

      await Customer.insertMany(sampleCustomers);
      console.log('Sample customers initialized');
    }
  } catch (error) {
    console.error('Error initializing sample data:', error.message);
  }
};

module.exports = connectDB;
