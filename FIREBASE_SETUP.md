# Firebase Setup Guide for OQUEST

## Current Status
OQUEST is currently using a **demo Firebase configuration**. To get full authentication working, you have two options:

---

## Option 1: Quick Fix (Demo Mode - For Testing)
The game will work with authentication enabled using the provided config. If you see API key errors:

1. Your Firebase project might have API restrictions
2. Solution: In Firebase Console:
   - Go to **Credentials** → **API Keys**
   - Click the key and edit it
   - Remove or disable **API Key Restrictions**
   - Save changes
   - Wait 5 minutes for propagation

---

## Option 2: Create Your Own Firebase Project (Recommended for Production)

### Step 1: Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Create a new project"** or **"Add project"**
3. Name it: `oquest` (or whatever you prefer)
4. Accept the terms and create

### Step 2: Enable Authentication
1. In Firebase console, go to **Build** → **Authentication**
2. Click **"Get Started"**
3. Click **Email/Password** provider
4. Enable it and save

### Step 3: Get Your Config
1. Go to **Project Settings** (gear icon top-left)
2. Under **Your apps**, click the **Web app** (or create one with `</>`  icon)
3. Copy the Firebase config object
4. It will look like:
```javascript
{
  apiKey: "AIzaSy...",
  authDomain: "yourproject.firebaseapp.com",
  projectId: "yourproject",
  storageBucket: "yourproject.appspot.com",
  messagingSenderId: "123456...",
  appId: "1:123456...:web:abc123..."
}
```

### Step 4: Update OQUEST Config
Replace the config in two files:

**File 1: `src/App.jsx` (Lines 8-15)**
```javascript
const firebaseConfig = {
  apiKey: "YOUR_KEY_HERE",
  authDomain: "YOUR_DOMAIN.firebaseapp.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_BUCKET.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

**File 2: `src/firebase.js` (Lines 8-15)** - Same config

### Step 5: Restart the Game
```bash
npm run build
npm run dev
```
Then try logging in again!

---

## Troubleshooting

### "auth/api-key-not-valid"
- **Cause**: API key doesn't have authentication enabled
- **Fix**: 
  1. Firebase Console → **APIs & Services**
  2. Enable **Identity Toolkit API**
  3. Wait 5-10 minutes
  4. Try again

### "auth/project-not-configured"
- **Cause**: Authentication not enabled in Firebase
- **Fix**: Follow Step 2 above to enable Email/Password auth

### "cors-policy" Error
- **Cause**: Firebase API key restrictions blocking localhost
- **Fix**: In Firebase, edit your API key:
  - Remove API restrictions
  - Or add `http://localhost:*` to restrictions

### Can't find API Key
- **Solution**: 
  1. Firebase Console → **Settings** (gear icon)
  2. Click **Project Settings**
  3. Go to **Service Accounts** tab
  4. Create new private key
  5. Or go to **Credentials** tab for API keys

---

## Default Demo Config (Currently in Use)

The game includes a demo config you can test with. However, for production:
- Set up your own Firebase project
- Keep API keys confidential
- Never commit real API keys to public repos

---

## Next Steps

1. **For Quick Testing**: Just skip login errors and test the game
2. **For Full Features**: Set up your own Firebase project using the steps above
3. **Need Help?**: The game automatically logs detailed errors to console (F12)

The game is fully functional! This is just for authentication persistence across browser sessions.
