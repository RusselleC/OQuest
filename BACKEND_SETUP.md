# OQuest Backend Setup

## Running the Game with Backend Proxy

The Oracle AI now requires a backend server to communicate with the Groq API (this avoids CORS issues).

### Option 1: Run Both Frontend + Backend Together

```bash
npm run dev-full
```

This starts:
- **Backend proxy**: http://localhost:3001 (handles Groq API requests securely)
- **Frontend (Vite)**: http://localhost:5173 (the game)

### Option 2: Run Separately (useful for debugging)

**Terminal 1 - Start Backend:**
```bash
npm run server
```
Expected output:
```
🔮 OQuest Backend Proxy listening on http://localhost:3001
📡 Oracle endpoint: POST http://localhost:3001/api/oracle
```

**Terminal 2 - Start Frontend:**
```bash
npm run dev
```
Expected output:
```
VITE v7.x.x ready in xxx ms
➜  Local:   http://localhost:5173/
```

### What Changed

- ✅ **Backend Server** ([server.js](server.js)): Express.js proxy that handles Groq API calls
- ✅ **API Key Security**: Private key now stored only on backend (not exposed in frontend code)
- ✅ **CORS Fixed**: Backend bypasses browser CORS restrictions
- ✅ **Frontend Updated**: Calls `http://localhost:3001/api/oracle` instead of Groq directly

### Troubleshooting

**"Cannot reach the Oracle's realm"?**
- ✅ Check if backend is running: `http://localhost:3001/health`
- ✅ Make sure port 3001 is not blocked
- ✅ Run `npm run server` first, then open the game

**Backend returns 400 error?**
- Check backend console for Groq error details
- Verify Groq API key is still valid at https://console.groq.com
- Open F12 DevTools in browser to see full error

**Game works but Oracle is silent?**
- Ensure backend proxy is running in another terminal
- Check F12 Console for network errors
