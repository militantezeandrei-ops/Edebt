# QR Scanner - Customer Orders App

A full-stack application for scanning customer QR codes and managing their orders. The workflow is: **Scan QR → Choose Order → Save to Database**.

## Features

- 📱 QR Code Scanner - Scan customer unique IDs from QR codes
- 👤 Customer Management - View customer information after scanning
- 🛒 Order Selection - Choose from predefined orders or create custom orders
- 💾 Online Database - Save orders to MongoDB Atlas (cloud database)
- 🎨 Modern UI - Beautiful, responsive interface

## Tech Stack

- **Frontend**: React with HTML5 QR Code Scanner
- **Backend**: Node.js with Express
- **Database**: MongoDB Atlas (Cloud Database)
- **API**: RESTful API for customer and order management

## Prerequisites

- Node.js (v14 or higher)
- MongoDB Atlas account (free tier available)
- npm or yarn

## Setup Instructions

### 1. MongoDB Atlas Setup (Online Database)

1. **Create a MongoDB Atlas Account:**
   - Go to [https://www.mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
   - Sign up for a free account

2. **Create a Cluster:**
   - Click "Build a Database"
   - Choose the FREE tier (M0)
   - Select a cloud provider and region
   - Click "Create Cluster"

3. **Create Database User:**
   - Go to "Database Access" in the left sidebar
   - Click "Add New Database User"
   - Choose "Password" authentication
   - Enter a username and password (save these!)
   - Set user privileges to "Atlas admin" or "Read and write to any database"
   - Click "Add User"

4. **Configure Network Access:**
   - Go to "Network Access" in the left sidebar
   - Click "Add IP Address"
   - Click "Allow Access from Anywhere" (for development) or add your IP
   - Click "Confirm"

5. **Get Connection String:**
   - Go to "Database" in the left sidebar
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string (looks like: `mongodb+srv://username:password@cluster.mongodb.net/`)
   - Replace `<password>` with your database user password
   - Replace `<dbname>` with `qr_scanner_db` (or any name you prefer)

### 2. Install Dependencies

```bash
npm run install-all
```

### 3. Configure Environment Variables

1. Create a `.env` file in the root directory:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your MongoDB connection string:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/qr_scanner_db?retryWrites=true&w=majority
   PORT=5000
   ```

   Replace `username`, `password`, and `cluster` with your actual MongoDB Atlas credentials.

### 4. Start the Application

**Terminal 1 - Backend Server:**
```bash
npm start
```
The server will run on `http://localhost:5000`

**Terminal 2 - Frontend Client:**
```bash
npm run client
```
The app will open in your browser at `http://localhost:3000`

## Usage

1. **Scan QR Code**: Point your camera at a customer's QR code containing their unique ID
2. **View Customer Info**: After scanning, customer information is displayed
3. **Create Customer** (if not found): If the customer doesn't exist, you'll be prompted to create them
4. **Select Order**: 
   - Choose from predefined orders (quick select buttons)
   - Or manually enter order details
5. **Save Order**: Click "Save Order" to store it in the MongoDB database linked to the customer

## API Endpoints

### Customers
- `GET /api/customer/:uniqueId` - Get customer by unique ID
- `POST /api/customer` - Create new customer

### Orders
- `GET /api/customer/:uniqueId/orders` - Get all orders for a customer
- `POST /api/order` - Create new order
- `GET /api/orders` - Get all orders

### Health Check
- `GET /api/health` - Check server and database connection status

## Sample Customer IDs

The database is automatically populated with sample customers on first run:
- `CUST001` - John Doe
- `CUST002` - Jane Smith
- `CUST003` - Bob Johnson

You can create QR codes with these IDs for testing.

## Creating QR Codes for Testing

You can use any QR code generator online (like [qr-code-generator.com](https://www.qr-code-generator.com/)) and enter one of the sample customer IDs (e.g., `CUST001`) to generate a test QR code.

## Database Schema

### Customers Collection
- `_id` - MongoDB ObjectId (auto-generated)
- `unique_id` - Unique customer identifier (from QR code) - **Indexed**
- `name` - Customer name
- `email` - Customer email
- `phone` - Customer phone
- `createdAt` - Auto-generated timestamp
- `updatedAt` - Auto-generated timestamp

### Orders Collection
- `_id` - MongoDB ObjectId (auto-generated)
- `customer_id` - Reference to Customer document
- `customer_unique_id` - Customer unique ID - **Indexed**
- `order_name` - Name of the order
- `order_description` - Order description
- `order_amount` - Order amount (number)
- `order_status` - Order status (pending, processing, completed, cancelled)
- `createdAt` - Auto-generated timestamp
- `updatedAt` - Auto-generated timestamp

## Development

- Backend runs on port 5000
- Frontend runs on port 3000
- Database: MongoDB Atlas (cloud-hosted)
- Environment variables: `.env` file (not committed to git)

## Troubleshooting

### Connection Issues
- Verify your MongoDB connection string in `.env`
- Check that your IP address is whitelisted in MongoDB Atlas
- Ensure your database user has the correct permissions
- Check the server logs for detailed error messages

### Port Already in Use
If port 5000 is already in use:
```bash
# Windows PowerShell
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Or change PORT in .env file
```

## License

ISC
