# API Key Security Setup Guide

## Overview
Your API keys have been secured using environment variables to prevent accidental exposure on GitHub.

## What Changed

### Files Modified:
1. **`.gitignore`** - Added `.env` and `.env.local` to prevent pushing sensitive files
2. **`src/firebase.js`** - Now reads Firebase config from environment variables
3. **`src/config/firebase.js`** - Now reads Firebase config from environment variables
4. **`src/config/constants.js`** - Now reads Gemini API key from environment variables

### Files Created:
1. **`.env`** - Local development file with actual API keys (NOT committed to Git)
2. **`.env.example`** - Template showing required environment variables for Firebase and Gemini
3. **`.env.example.server`** - Template showing server-side environment variables (Groq API)

## Setup Instructions

### For Development (Local Machine)

1. **Frontend Environment Setup:**
   - The `.env` file in the root directory already contains your API keys
   - Make sure it exists before running `npm start`
   - This file is ignored by Git, so your keys won't be pushed

2. **Backend Server Setup:**
   - Create a `.env` file in the root directory (or use the existing one)
   - Add your Groq API key:
     ```
     GROQ_API_KEY=your_groq_api_key_here
     PORT=3001
     ```

3. **Run Development:**
   ```bash
   npm start              # Frontend
   npm run electron-dev   # With Electron
   node server.js         # Backend (in another terminal)
   ```

### For Production / GitHub Sharing

1. **Never commit `.env` files** - They are already in `.gitignore`
2. **Share `.env.example` and `.env.example.server`** - Show structure without secrets
3. **Set environment variables in your deployment platform:**
   - GitHub Actions: Use Secrets in repository settings
   - Vercel/Netlify: Use environment variable settings in dashboard
   - Heroku: Use `heroku config:set` command
   - Self-hosted: Set system environment variables or use deployment configs

### GitHub Actions Example
```yaml
name: Build
on: push
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Create .env file
        run: |
          echo "VITE_FIREBASE_API_KEY=${{ secrets.VITE_FIREBASE_API_KEY }}" >> .env
          echo "VITE_GEMINI_API_KEY=${{ secrets.VITE_GEMINI_API_KEY }}" >> .env
          # Add other variables...
```

## Environment Variables Reference

### Frontend (Vite)
All frontend env vars must start with `VITE_` to be accessible:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_DATABASE_URL`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_GEMINI_API_KEY`

### Backend (Node.js)
- `GROQ_API_KEY`
- `PORT` (default: 3001)

## Best Practices

✅ **DO:**
- Keep `.env` files local only
- Use `.env.example` as documentation template
- Set environment variables in deployment platforms
- Rotate API keys if they've been exposed
- Use different keys for development vs production

❌ **DON'T:**
- Commit `.env` files to Git
- Share API keys in messages or code
- Hard-code keys in source files
- Use the same keys for multiple environments

## Troubleshooting

**Issue:** "VITE_GEMINI_API_KEY is undefined"
- Solution: Make sure `.env` file exists in project root and Vite dev server is restarted

**Issue:** "GROQ_API_KEY is empty on backend"
- Solution: Verify `.env` file is in root directory and `server.js` is reading it with `dotenv.config()`

## How Environment Variables Are Loaded

- **Frontend (Vite):** Loaded at build time from `.env` file during `npm start` or `npm build`
- **Backend (Node.js):** Loaded at runtime using `dotenv.config()` in `server.js`

For more info: https://vitejs.dev/guide/env-and-mode.html
