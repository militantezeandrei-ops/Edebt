# e-Debt & Handwritten Order System

A full-stack application for digitizing handwritten order slips using advanced Cloud-based OCR and managing customer orders and debts. The workflow is: **Capture Handwriting → Verify Order → Save to Database**.

## Features

- � **Handwritten Recognition** - Analyze handwritten order slips using **Cloud-based OCR** technology to automatically extract items and prices
- 👤 **Customer Management** - View customer information, track balances, and manage profiles
- 🛒 **Smart Order Processing** - Auto-detect items, prices, and map them to customers
- 💾 **Online Database** - Real-time data sync with MongoDB Atlas
- 🎨 **Modern UI** - Beautiful, responsive interface with Dark Mode support and PWA capabilities

## Tech Stack

- **Frontend**: React.js
- **Backend**: Node.js with Express
- **Database**: MongoDB Atlas
- **AI/OCR**: Cloud-based Generative AI for handwriting recognition
- **API**: RESTful API

## Prerequisites

- Node.js (v14 or higher)
- MongoDB Atlas account
- Cloud OCR Service API Key

## Setup Instructions

### 1. MongoDB Atlas Setup

1. Create a free account at [MongoDB Cloud](https://www.mongodb.com/cloud/atlas).
2. Create a Cluster (M0 Free Tier).
3. Create a Database User (Username/Password).
4. Allow Network Access (IP Whitelist).
5. Get the Connection String (SRV URI).

### 2. Install Dependencies

```bash
npm run install-all
```

### 3. Configure Environment Variables

1. Create a `.env` file in the root directory:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your credentials:
   ```env
   # Database Connection
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/debt_app_db?retryWrites=true&w=majority

   # Server Port
   PORT=5000

   # Cloud OCR Service API Key (Required for Handwriting features)
   GOOGLE_VISION_API_KEY=your_api_key_here
   ```

### 4. Start the Application

**Terminal 1 - Backend Server:**
```bash
npm start
```
Server runs on: `http://localhost:5000`

**Terminal 2 - Frontend Client:**
```bash
npm run client
```
App opens at: `http://localhost:3000`

## Usage

### 📝 Capturing Handwritten Orders
1. Navigate to the **"Capture Order"** tab.
2. Click **"Capture Order Slip"**.
3. Take a clear photo of the handwritten note.
4. The system will use **Cloud-based OCR** to read the text.
5. Review the detected items and prices.
6. Assign to a customer (if not auto-detected) and click **"Save Order"**.

### 📊 Reports & Analytics
- View weekly sales reports
- Track customer debts and frequently ordered items
- Export data as needed

## API Endpoints

### Customers
- `GET /api/customer/:uniqueId` - Get customer details
- `POST /api/customer` - Create new customer
- `GET /api/customers/search` - Fuzzy search customers by name

### Orders
- `GET /api/orders` - Get all orders
- `POST /api/order` - Create single order
- `POST /api/orders/batch` - Create multiple orders
- `POST /api/ocr/process` - Process image with Cloud-based OCR

## License

ISC
