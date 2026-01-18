# MongoDB Atlas Setup Guide

## Quick Setup Steps

### 1. Create MongoDB Atlas Account
1. Visit [https://www.mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up for a free account (no credit card required for free tier)

### 2. Create a Cluster
1. Click "Build a Database"
2. Select **FREE (M0)** tier
3. Choose a cloud provider and region (closest to you)
4. Click "Create Cluster" (takes 3-5 minutes)

### 3. Create Database User
1. Go to "Database Access" → "Add New Database User"
2. Authentication: **Password**
3. Enter username and password (save these!)
4. User Privileges: **Atlas admin**
5. Click "Add User"

### 4. Configure Network Access
1. Go to "Network Access" → "Add IP Address"
2. Click **"Allow Access from Anywhere"** (for development)
   - Or add your specific IP address for production
3. Click "Confirm"

### 5. Get Connection String
1. Go to "Database" → Click "Connect" on your cluster
2. Choose **"Connect your application"**
3. Copy the connection string
4. It looks like:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

### 6. Configure Your App
1. Create a `.env` file in the project root:
   ```bash
   MONGODB_URI=mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/qr_scanner_db?retryWrites=true&w=majority
   PORT=5000
   ```

2. Replace:
   - `YOUR_USERNAME` with your database username
   - `YOUR_PASSWORD` with your database password
   - `cluster0.xxxxx` with your actual cluster address
   - `qr_scanner_db` is the database name (you can change this)

### 7. Install and Run
```bash
# Install dependencies
npm run install-all

# Start backend (Terminal 1)
npm start

# Start frontend (Terminal 2)
npm run client
```

## Example .env File
```
MONGODB_URI=mongodb+srv://myuser:mypassword@cluster0.abc123.mongodb.net/qr_scanner_db?retryWrites=true&w=majority
PORT=5000
```

## Troubleshooting

**Connection Error?**
- Check your username/password in the connection string
- Verify your IP is whitelisted in Network Access
- Ensure the cluster is fully created (green status)

**Authentication Failed?**
- Make sure you URL-encoded your password (replace special characters)
- Example: `@` becomes `%40`, `#` becomes `%23`

**Can't Connect?**
- Check MongoDB Atlas dashboard - cluster should be green
- Verify connection string format
- Check server logs for detailed error messages
