# 🚂 Railway Backend Deployment Guide

## First Time Deployment

### Step 1: Sign Up / Login
1. Go to [railway.app](https://railway.app)
2. Click "Login" or "Start a New Project"
3. Sign up with GitHub (recommended) or email

### Step 2: Create New Project
1. Click **"New Project"** button
2. Choose one of these options:

   **Option A: Deploy from GitHub (Recommended)**
   - Select "Deploy from GitHub repo"
   - Authorize Railway to access your GitHub
   - Select your repository
   - Railway will auto-detect it's a Node.js app

   **Option B: Empty Project**
   - Click "Empty Project"
   - Click "Add Service" → "GitHub Repo"
   - Select your repository

### Step 3: Configure Environment Variables
1. In your Railway project, click on the service
2. Go to **"Variables"** tab
3. Click **"New Variable"**
4. Add these variables:

   **Variable 1:**
   - **Name:** `MONGODB_URI`
   - **Value:** `mongodb+srv://DebtandPOS:IrA1aNjxH5G9pwqL@cluster0.tr42kr2.mongodb.net/qr_scanner_db?retryWrites=true&w=majority`
   - Click "Add"

   **Variable 2 (Optional):**
   - **Name:** `PORT`
   - **Value:** (Leave empty - Railway auto-assigns)
   - Or set to: `5000`

5. Click "Save" or "Deploy"

### Step 4: Wait for Deployment
- Railway will automatically:
  - Install dependencies (`npm install`)
  - Start the server (`npm start`)
- Watch the logs to see progress
- Wait for "Deployment successful" message

### Step 5: Get Your Backend URL
1. Click on your service
2. Go to **"Settings"** tab
3. Scroll to **"Domains"** section
4. Click **"Generate Domain"**
5. Copy the URL (e.g., `https://your-app-production.up.railway.app`)

---

## Redeploy / Update Existing Deployment

### Method 1: Automatic (GitHub Integration)
If you connected GitHub:
1. **Push changes to GitHub:**
   ```bash
   git add .
   git commit -m "Update backend"
   git push
   ```
2. **Railway auto-deploys** - it detects the push and redeploys automatically
3. Check Railway dashboard to see deployment progress

### Method 2: Manual Redeploy
1. Go to your Railway project
2. Click on your service
3. Go to **"Deployments"** tab
4. Find the deployment you want to redeploy
5. Click the **"..."** menu → **"Redeploy"**

### Method 3: Restart Service
1. Go to your Railway project
2. Click on your service
3. Click **"Settings"** tab
4. Scroll down and click **"Restart"** button

---

## View Logs / Debug

1. Go to your Railway project
2. Click on your service
3. Go to **"Deployments"** tab
4. Click on the latest deployment
5. View **"Logs"** to see:
   - Build output
   - Server startup messages
   - MongoDB connection status
   - Any errors

**Look for:**
- ✅ `MongoDB Connected: ...`
- ✅ `Server running on http://localhost:5000`
- ❌ Any error messages

---

## Update Environment Variables

1. Go to your Railway project
2. Click on your service
3. Go to **"Variables"** tab
4. **Edit existing variable:**
   - Click on the variable
   - Change the value
   - Click "Save"
5. **Add new variable:**
   - Click "New Variable"
   - Add name and value
   - Click "Add"
6. Railway will **automatically redeploy** when you save variables

---

## Common Issues & Solutions

### "Deployment Failed"
- Check the logs for error messages
- Verify `MONGODB_URI` is set correctly
- Make sure `package.json` has a `start` script
- Check that `server.js` exists in the root

### "Cannot connect to MongoDB"
- Verify `MONGODB_URI` is correct
- Check MongoDB Atlas Network Access allows all IPs
- Check MongoDB Atlas connection string format

### "Port already in use"
- Railway auto-assigns ports, don't hardcode PORT
- Use `process.env.PORT || 5000` in your code (already done)

### Service Not Starting
- Check logs for errors
- Verify all dependencies are in `package.json`
- Make sure `npm start` command works locally

---

## Quick Commands Reference

### Check Railway Status
- Visit: [railway.app/dashboard](https://railway.app/dashboard)
- See all your projects and services

### View Service Logs
- Railway Dashboard → Your Project → Your Service → Deployments → Logs

### Get Service URL
- Railway Dashboard → Your Project → Your Service → Settings → Domains

---

## ✅ Deployment Checklist

- [ ] Railway account created
- [ ] Project created and connected to GitHub
- [ ] `MONGODB_URI` environment variable set
- [ ] Deployment successful (green status)
- [ ] Backend URL copied (e.g., `https://xxx.railway.app`)
- [ ] Can access `/api/health` endpoint
- [ ] MongoDB connection working (check logs)

---

## 🎯 Next Steps After Deployment

1. **Copy your Railway backend URL**
   - Example: `https://qr-scanner-backend.railway.app`

2. **Set it in Netlify:**
   - Netlify Dashboard → Site Settings → Environment Variables
   - Add: `REACT_APP_API_URL` = your Railway URL

3. **Redeploy Netlify:**
   - Deploys → Trigger deploy

4. **Test:**
   - Open your Netlify site
   - Should see "✅ Backend connected"

---

## 💡 Pro Tips

- **Free Tier:** Railway gives you $5 free credit monthly
- **Auto-Deploy:** Every GitHub push auto-deploys
- **Logs:** Always check logs if something doesn't work
- **Variables:** Changes to environment variables trigger auto-redeploy
- **Domains:** Railway provides HTTPS automatically

---

## 🆘 Need Help?

1. Check Railway logs first
2. Verify environment variables are set
3. Test backend URL directly: `https://your-backend.railway.app/api/health`
4. Should return: `{"status":"OK","database":"Connected"}`
