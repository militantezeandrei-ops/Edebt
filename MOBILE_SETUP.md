# Mobile App Setup Guide

Your QR Scanner app can now be installed as a mobile app! Here are two options:

## Option 1: Progressive Web App (PWA) - Easiest ✅

### For Android:
1. Open the app in Chrome browser
2. Tap the menu (3 dots) → "Add to Home screen" or "Install app"
3. The app will be installed and appear like a native app!

### For iOS (iPhone/iPad):
1. Open the app in Safari browser
2. Tap the Share button (square with arrow)
3. Scroll down and tap "Add to Home Screen"
4. The app will be installed on your home screen!

### Features:
- ✅ Works offline (cached)
- ✅ App icon on home screen
- ✅ Full-screen experience
- ✅ No app store needed
- ✅ Works on both Android and iOS

## Option 2: Native App with Capacitor (For App Stores)

If you want to publish to Google Play Store or Apple App Store:

### Setup Capacitor:

```bash
# Install Capacitor
npm install -g @capacitor/cli
cd client
npm install @capacitor/core @capacitor/cli
npm install @capacitor/android @capacitor/ios

# Initialize Capacitor
npx cap init

# Build the React app
npm run build

# Add platforms
npx cap add android
npx cap add ios

# Sync with native projects
npx cap sync

# Open in Android Studio / Xcode
npx cap open android
npx cap open ios
```

### Build for Production:

**Android:**
```bash
npx cap sync android
# Open Android Studio and build APK/AAB
```

**iOS:**
```bash
npx cap sync ios
# Open Xcode and build for App Store
```

## Current Setup (PWA)

The app is already configured as a PWA! Just:

1. **Build the production version:**
   ```bash
   cd client
   npm run build
   ```

2. **Deploy to a web server** (like Netlify, Vercel, or your own server)

3. **Users can install it** by visiting the website and using "Add to Home Screen"

## Recommended: Deploy to Netlify (Free)

1. Go to [netlify.com](https://www.netlify.com)
2. Sign up (free)
3. Connect your GitHub repo or drag & drop the `client/build` folder
4. Your app will be live at `your-app.netlify.app`
5. Users can install it from there!

## Testing PWA Locally:

1. Build the app:
   ```bash
   cd client
   npm run build
   ```

2. Serve it:
   ```bash
   npx serve -s build
   ```

3. Open on your phone's browser and install!

## Notes:

- **PWA** is the fastest way - works immediately
- **Capacitor** is for app store distribution (requires developer accounts)
- For most use cases, PWA is perfect!
