# Vercel Deployment Guide for OQuest

## Prerequisites
- GitHub repo is pushed (✅ Done)
- Vercel account at https://vercel.com (sign up with GitHub if you don't have one)

## Step 1: Deploy to Vercel

1. Go to https://vercel.com/new
2. Click **Import Git Repository**
3. Search for `OQuest` repository and select it
4. Click **Import**

## Step 2: Configure Project Settings

On the "Configure Project" page:

### Framework Preset
- Select: **Vite**

### Root Directory
- Leave as: `./` (root directory is correct)

### Build and Output Settings (should auto-detect)
- Build Command: `npm run build`
- Output Directory: `dist`

## Step 3: Add Environment Variables

This is **CRITICAL** - your API keys must go here:

Click **Environment Variables** and add:

### Frontend Variables (Vite)
```
VITE_FIREBASE_API_KEY = AIzaSyCoXG64zCIVOjwU2haBt9sMAlgc_NQoCXE
VITE_FIREBASE_AUTH_DOMAIN = oquest-ndmc-142bf.firebaseapp.com
VITE_FIREBASE_DATABASE_URL = https://oquest-ndmc-142bf-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID = oquest-ndmc-142bf
VITE_FIREBASE_STORAGE_BUCKET = oquest-ndmc-142bf.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID = 659241437784
VITE_FIREBASE_APP_ID = 1:659241437784:web:8dc1df40c21f8d8b81d82d
VITE_GEMINI_API_KEY = AIzaSyD296Ld15Lh8pzUKGwQQM9CSqlsh9M9iA4
```

### Backend Variables (Node.js Server)
```
GROQ_API_KEY = your_groq_api_key_here
PORT = 3001
```

**How to add them:**
- For each variable, click **Add**
- Enter variable name (e.g., `VITE_FIREBASE_API_KEY`)
- Enter the value
- Select scope: **Production, Preview, Development** (select all)
- Repeat for all variables

## Step 4: Deploy

1. Click **Deploy**
2. Wait for build to complete (usually 2-5 minutes)
3. When done, you'll get a URL like: `https://oquest.vercel.app`

## Step 5: Verify Deployment

Your site should be live! Visit the URL to test:
- Check that the game loads
- Test login/database features
- Check that Gemini AI responses work

## Troubleshooting

### Build Fails
**Error: "Cannot find module 'vite'"**
- Solution: Make sure `vite` and dev dependencies are in your `package.json`

**Error: "API key is undefined"**
- Solution: 
  1. Check Environment Variables in Vercel dashboard
  2. Do a redeployment after adding variables: Settings → Deployments → Redeploy

### App Shows Blank Screen
1. Open browser DevTools (F12)
2. Check Console tab for errors
3. Common issues:
   - Firebase not initialized (check API key is set)
   - CORS issues (may need server.js running on backend)

### Backend (server.js) Not Working
OQuest has two parts:
- **Frontend** (React/Vite) - deployed to Vercel ✅
- **Backend** (Node.js) - needs its own deployment

For backend Oracle/AI features, you'll need to deploy `server.js` separately:

**Option A: Deploy Backend to Vercel (Recommended)**
1. Create a new Vercel project
2. Point to the same GitHub repo
3. Configure root directory as: `./`
4. Set build command: `npm install` (no build needed)
5. Set start command: `node server.js`
6. Add `GROQ_API_KEY` environment variable
7. Deploy

**Option B: Deploy Backend to Render/Railway**
- Render: https://render.com (free tier available)
- Railway: https://railway.app (free tier available)

Then update your frontend to call the backend API at that URL.

## Update GitHub Remote (Enable Auto-Deployments)

Your Vercel project is now connected to GitHub. Every time you push to `main`:
- Vercel automatically builds and deploys
- You can see deployment logs in Vercel dashboard

To verify auto-deployment works:
1. Make a small change locally
2. Commit and push to GitHub
3. Check Vercel dashboard - new deployment should start automatically

## Environment Variables Reference

All variables starting with `VITE_` are exposed to the frontend (visible to clients in a safe way).

**Safe variables to expose:**
- Firebase API key (can be public)
- Firebase auth domain
- Gemini API key (can be public, limited by quotas)

**Never expose:**
- Backend secrets
- Database credentials
- Payment keys

## Next Steps

1. Verify the deployment works
2. Test core features (login, database, AI Oracle)
3. Push any additional changes to GitHub (auto-deploys to Vercel)
4. Consider adding a custom domain (Vercel Settings → Domains)

## Support

- Vercel Docs: https://vercel.com/docs
- Common Issues: https://vercel.com/help/common-questions
- Status Page: https://www.vercel-status.com
