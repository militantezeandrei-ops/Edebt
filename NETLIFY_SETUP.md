# 🔧 Netlify Setup Guide - Fix Database Connection

## Problem
When deployed to Netlify, the app can't connect to the database because it's trying to use `localhost:5000`, which doesn't work from Netlify.

## Solution
You need to:
1. **Deploy your backend** to Railway/Render (free)
2. **Set environment variable** in Netlify pointing to your backend

---

## Step 1: Deploy Backend to Railway (5 minutes)

### Option A: Railway (Recommended)

1. **Go to [railway.app](https://railway.app)**
   - Sign up with GitHub (free)

2. **Create New Project:**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository
   - OR click "Empty Project" → "Add Service" → "GitHub Repo"

3. **Configure Environment Variables:**
   - In Railway project, go to "Variables" tab
   - Add these variables:
     ```
     MONGODB_URI = mongodb+srv://DebtandPOS:IrA1aNjxH5G9pwqL@cluster0.tr42kr2.mongodb.net/qr_scanner_db?retryWrites=true&w=majority
     PORT = (Railway auto-assigns, but you can set it)
     ```

4. **Deploy:**
   - Railway auto-detects Node.js
   - It will run `npm start`
   - Wait for deployment to complete

5. **Get Your Backend URL:**
   - Railway gives you a URL like: `https://your-app.railway.app`
   - Click on the service → "Settings" → "Generate Domain"
   - Copy the URL (e.g., `https://qr-scanner-backend.railway.app`)

### Option B: Render

1. **Go to [render.com](https://render.com)**
   - Sign up (free)

2. **Create Web Service:**
   - Click "New" → "Web Service"
   - Connect your GitHub repo
   - Select the root directory (where `server.js` is)

3. **Configure:**
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Environment Variables:
     ```
     MONGODB_URI = mongodb+srv://DebtandPOS:IrA1aNjxH5G9pwqL@cluster0.tr42kr2.mongodb.net/qr_scanner_db?retryWrites=true&w=majority
     ```

4. **Deploy:**
   - Click "Create Web Service"
   - Wait for deployment

5. **Get Your Backend URL:**
   - Render gives you: `https://your-app.onrender.com`

---

## Step 2: Configure Netlify Environment Variable

1. **Go to your Netlify site dashboard**

2. **Navigate to:**
   - Site settings → Environment variables
   - OR: Build & deploy → Environment → Environment variables

3. **Add New Variable:**
   - **Key:** `REACT_APP_API_URL`
   - **Value:** Your Railway/Render backend URL
     - Example: `https://qr-scanner-backend.railway.app`
     - Example: `https://your-app.onrender.com`
   - **Scopes:** Production, Preview, Deploy previews (check all)

4. **Save**

5. **Redeploy:**
   - Go to "Deploys" tab
   - Click "Trigger deploy" → "Clear cache and deploy site"
   - OR push a new commit to trigger rebuild

---

## Step 3: Verify It Works

1. **Check Connection Status:**
   - Open your Netlify site
   - You should see a green "✅ Backend connected" message at the top
   - If red, check the error message

2. **Test the App:**
   - Try scanning a QR code
   - Should connect to MongoDB and find customers

3. **Check Browser Console:**
   - Open Developer Tools (F12)
   - Look for: `✅ Using REACT_APP_API_URL: https://your-backend.railway.app`
   - Should NOT see localhost

---

## 🔍 Troubleshooting

### "Cannot connect to backend"
- ✅ Check backend is deployed and running (visit backend URL directly)
- ✅ Check `REACT_APP_API_URL` is set in Netlify
- ✅ Check backend URL is correct (no typos)
- ✅ Redeploy Netlify after setting environment variable

### "Backend URL not configured"
- ✅ Make sure `REACT_APP_API_URL` is set in Netlify
- ✅ Make sure it's spelled exactly: `REACT_APP_API_URL` (case-sensitive)
- ✅ Redeploy after adding the variable

### Backend shows errors
- ✅ Check MongoDB connection string is correct
- ✅ Check Railway/Render logs for errors
- ✅ Verify MongoDB Atlas allows connections from anywhere (Network Access)

### CORS errors
- ✅ Backend CORS is already configured to allow Netlify domains
- ✅ If still issues, check backend logs

---

## ✅ Quick Checklist

- [ ] Backend deployed to Railway/Render
- [ ] Backend URL copied (e.g., `https://xxx.railway.app`)
- [ ] `REACT_APP_API_URL` set in Netlify environment variables
- [ ] Netlify site redeployed
- [ ] Green "Backend connected" message shows
- [ ] App can scan QR codes and find customers

---

## 🎯 Example Configuration

**Railway Backend URL:**
```
https://qr-scanner-backend-production.up.railway.app
```

**Netlify Environment Variable:**
```
REACT_APP_API_URL = https://qr-scanner-backend-production.up.railway.app
```

**Result:**
- ✅ Frontend on Netlify connects to backend on Railway
- ✅ Backend connects to MongoDB Atlas
- ✅ Everything works! 🎉

---

## 📝 Notes

- **Environment variables** in Netlify are only available at build time
- You must **redeploy** after adding/changing environment variables
- The backend URL must be **HTTPS** (Railway/Render provide this automatically)
- MongoDB Atlas connection works from anywhere (already configured)
