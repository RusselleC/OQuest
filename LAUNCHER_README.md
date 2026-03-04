# OQUEST - Game Launcher Guide

## Quick Start (Windows)

### Option 1: Batch File (Easiest)
1. **Navigate to**: `c:\src\o-quest\`
2. **Double-click**: `launch.bat`
3. The game will start automatically and open in your browser at `http://localhost:5177`

### Option 2: Command Line
```bash
cd c:\src\o-quest
npm run dev
```

Then open `http://localhost:5177` in your browser.

### Option 3: Build & Deploy (Production)
```bash
cd c:\src\o-quest
npm run build
```
This creates optimized files in the `dist/` folder.

---

## Requirements
- **Node.js** (https://nodejs.org/) - Required to run the game
- **Modern Browser** - Chrome, Firefox, Edge, Safari (latest versions)
- **Internet Connection** - For Firebase authentication

---

## Troubleshooting

### "Node.js is not installed"
- Download and install Node.js from https://nodejs.org/
- Restart your computer after installation
- Try running `launch.bat` again

### "Port 5173+ is in use"
- The game tried multiple ports. The console shows which port is active
- Check the console message for the actual URL (usually 5177, 5178, etc.)

### Dependencies won't install
- Delete the `node_modules` folder
- Run `npm install` manually in command prompt
- Try `npm cache clean --force` if issues persist

---

## Game Controls
- **WASD** or **Arrow Keys** - Move
- **E** - Interact with NPCs
- **I** - Inventory
- **Q** - Quest Log
- **ESC** - Menu (if available)

---

## Firebase Setup (Optional)
The game uses Firebase for authentication. To use a real Firebase project:

1. Go to https://firebase.google.com/
2. Create a new project
3. Get your Firebase config
4. Update the config in `src/App.jsx` (lines 8-20)

---

## Need Help?
- Check the **Guide** in-game for OS concepts
- Visit the Adventurer's Guide for official tutorial
- All OS terms are defined in the glossary
