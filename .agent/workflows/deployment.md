---
description: Deploy the Full Stack MERN App to Render.com
---

This workflow guides you through deploying your application (Frontend + Backend together) to Render.com.

## Prerequisites
1.  **GitHub Repository:** Ensure your code is pushed to a GitHub repository.
2.  **MongoDB Atlas:** You must have your connection string ready (`MONGODB_URI`).
3.  **API Key:** Your Google Gemini/Vision API key.

## Step 1: Push Code to GitHub
Ensure all your latest changes are committed and pushed.
```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

## Step 2: Create Web Service on Render
1.  Log in to [dashboard.render.com](https://dashboard.render.com/).
2.  Click **"New +"** and select **"Web Service"**.
3.  Connect your GitHub repository.

## Step 3: Configure Service Settings
Fill in the details as follows:

*   **Name:** `e-debt-app` (or your choice)
*   **Region:** Choose the one closest to you (e.g., Singapore).
*   **Branch:** `main`
*   **Root Directory:** `.` (Leave blank)
*   **Runtime:** `Node`
*   **Build Command:** `npm install && npm run build`
    *   *Note: This command is defined in your package.json to install dependencies and build the React client.*
*   **Start Command:** `npm start`

## Step 4: Environment Variables (Critical)
Scroll down to "Environment Variables" and add the following:

| Key | Value |
| :--- | :--- |
| `NODE_ENV` | `production` |
| `MONGODB_URI` | *Your actual MongoDB connection string* |
| `GOOGLE_VISION_API_KEY` | *Your Google API Key* |
| `GEMINI_API_KEY` | *Same as above (if used by specific scripts)* |

## Step 5: Deploy
1.  Click **"Create Web Service"**.
2.  Render will start building your app. It may take 3-5 minutes.
3.  Watch the logs. You should see "Build successful" and then "Server running...".

## Step 6: Verify
Once deployed, Render will give you a URL (e.g., `https://e-debt-app.onrender.com`).
Open it on your phone or computer. The app should load, and since it is served by the backend, API calls will work automatically!

---
**Troubleshooting:**
*   **Database Error:** Ensure your MongoDB Atlas "Network Access" allows connections from `0.0.0.0/0` (Allow Anywhere) since Render IPs change.
*   **White Screen:** Check the "Logs" tab in Render for any backend errors.
