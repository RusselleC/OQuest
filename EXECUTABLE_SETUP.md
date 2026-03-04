# OQUEST - Executable Setup Guide

## 3 Ways to Run the Game

### ✅ METHOD 1: Simple Batch File (FASTEST - Recommended for Windows)

**How to use:**
1. Open `c:\src\o-quest\`
2. **Double-click** `launch.bat`
3. Game auto-opens in your browser at `http://localhost:5177`

**Pros:**
- ✓ Easiest method
- ✓ No installation needed
- ✓ Works on all Windows versions
- ✓ Instant start

---

### ✅ METHOD 2: PowerShell (Windows with Pretty UI)

**How to use:**
```powershell
# Right-click PowerShell, choose "Run as Administrator"
cd c:\src\o-quest
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\launch.ps1
```

**Pros:**
- ✓ Colored output & better feedback
- ✓ Same speed as batch file
- ✓ More informative error messages

---

### ✅ METHOD 3: Electron Desktop App (Professional)

**One-time setup:**
```bash
cd c:\src\o-quest
npm install
npm run build
npm install -g electron-builder
```

**Run the Electron app:**
```bash
npm run electron
```

**Build standalone installer (.exe + Setup):**
```bash
npm run electron-build
```

This creates `dist/OQUEST Setup 1.0.0.exe` - a full Windows installer!

**Pros:**
- ✓ Looks like native Windows app
- ✓ Can create installer (.exe)
- ✓ Professional appearance
- ✓ System menu bar integration
- ✓ Can pin to Start Menu

**Cons:**
- ✗ Takes ~5 min first run (electron install)
- ✗ ~150MB additional space

---

## Requirements for All Methods

✓ **Node.js** (https://nodejs.org/)  
✓ **Modern browser** (Chrome, Firefox, Edge)  
✓ **Internet** (Firebase login)  

---

## Troubleshooting

### "Port already in use"
The app tries ports 5173, 5174, 5175, 5176, 5177...  
Check console for which port is open and use that URL.

### "Node.js not found"
- Install Node.js from https://nodejs.org/
- **Restart your computer**
- Try again

### Dependencies won't install
```bash
npm cache clean --force
rm -r node_modules
npm install
```

### "Access Denied" on PowerShell
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

## Quick Comparison

| Feature | Batch | PowerShell | Electron |
|---------|-------|------------|----------|
| Speed | ⚡⚡⚡ | ⚡⚡⚡ | ⚡⚡ |
| Ease | Easiest | Easy | Medium |
| Professional | Good | Good | Excellent |
| Setup Time | 0 min | 1 min | 5 min |
| Can Make Installer | No | No | Yes |
| File Size | ~10MB | ~10MB | ~150MB |

---

## Windows Desktop Shortcut (Optional)

**For quick access:**
1. Right-click `launch.bat` → Create shortcut
2. Right-click shortcut → Properties
3. Change **Start in** to: `c:\src\o-quest\`
4. Drag shortcut to Desktop

Now you can double-click from desktop to launch!

---

## Creating a Portable EXE (Advanced)

For a single standalone .exe with Node.js bundled:

```bash
npm install -g pkg
cd c:\src\o-quest
npm run build
pkg . --targets node18-win-x64
```

This creates an `osquest` executable (~50MB) containing everything!

---

## Deployment & Sharing

### Option A: Zip & Share
```bash
# Build production version
npm run build

# Share the entire c:\src\o-quest\ folder
# Others run: launch.bat
```

### Option B: Create Installer
```bash
npm run electron-build
# Share the .exe from dist/ folder
```

### Option C: Web Hosting
- Upload build files from `dist/` to web server
- Access via URL (no Node.js needed!)

---

## Support

For issues:
1. Check **LAUNCHER_README.md**
2. Try updating Node.js
3. Clear npm cache: `npm cache clean --force`
4. Reinstall: `npm install`
