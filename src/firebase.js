import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get, push, query, orderByChild, limitToLast } from 'firebase/database';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';

// Gemini AI API Key
export const GEMINI_API_KEY = "AIzaSyD296Ld15Lh8pzUKGwQQM9CSqlsh9M9iA4";

const firebaseConfig = {
  apiKey: "AIzaSyCoXG64zCIVOjwU2haBt9sMAlgc_NQoCXE",
  authDomain: "oquest-ndmc-142bf.firebaseapp.com",
  databaseURL: "https://oquest-ndmc-142bf-default-rtdb.firebaseio.com",
  projectId: "oquest-ndmc-142bf",
  storageBucket: "oquest-ndmc-142bf.firebasestorage.app",
  messagingSenderId: "659241437784",
  appId: "1:659241437784:web:8dc1df40c21f8d8b81d82d"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const database = getDatabase(app);

// Auth functions
export const registerUser = (email, password) => {
  return createUserWithEmailAndPassword(auth, email, password);
};

export const loginUser = (email, password) => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const logoutUser = () => {
  return signOut(auth);
};

export const onAuthChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};

// Database functions
export const saveLeaderboardEntry = async (userId, playerName, classChoice, score, xp, level, duration = 0, realm = "easy") => {
  try {
    const entryRef = push(ref(database, `leaderboard/${userId}/scores`));
    const date = new Date().toLocaleDateString();
    await set(entryRef, {
      name: playerName,
      class: classChoice,
      score,
      xp,
      level,
      date,
      duration, // duration in seconds
      realm, // realm difficulty level
      timestamp: Date.now()
    });
    return true;
  } catch (error) {
    console.error("Error saving leaderboard entry:", error);
    return false;
  }
};

export const getLeaderboard = async () => {
  try {
    const snapshot = await get(ref(database, 'leaderboard'));
    const allScores = [];
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      // Flatten all user scores
      Object.values(data).forEach(userScores => {
        if (userScores.scores) {
          Object.values(userScores.scores).forEach(score => {
            allScores.push(score);
          });
        }
      });
    }
    
    // Sort by score descending and take top 15
    allScores.sort((a, b) => b.score - a.score);
    return allScores.slice(0, 15);
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return [];
  }
};

export const saveUserProfile = async (userId, email, displayName) => {
  try {
    await set(ref(database, `users/${userId}`), {
      email,
      displayName,
      createdAt: new Date().toISOString()
    });
    return true;
  } catch (error) {
    console.error("Error saving user profile:", error);
    return false;
  }
};

// Save full player progress/game state
export const savePlayerProgress = async (userId, playerName, classChoice, stats, playerPos, inventory) => {
  try {
    await set(ref(database, `players/${userId}/progress`), {
      playerName,
      classChoice,
      stats,
      playerPos,
      inventory,
      lastSaved: new Date().toISOString(),
      timestamp: Date.now()
    });
    return true;
  } catch (error) {
    console.error("Error saving player progress:", error);
    return false;
  }
};

// Get saved player progress
export const getPlayerProgress = async (userId) => {
  try {
    const snapshot = await get(ref(database, `players/${userId}/progress`));
    if (snapshot.exists()) {
      return snapshot.val();
    }
    return null;
  } catch (error) {
    console.error("Error fetching player progress:", error);
    return null;
  }
};

// Get user's score history
export const getUserScoreHistory = async (userId) => {
  try {
    const snapshot = await get(ref(database, `leaderboard/${userId}/scores`));
    if (snapshot.exists()) {
      const data = snapshot.val();
      const scores = Object.values(data).sort((a, b) => b.timestamp - a.timestamp);
      return scores;
    }
    return [];
  } catch (error) {
    console.error("Error fetching user score history:", error);
    return [];
  }
};

// Get combined leaderboard: global top + user history
export const getGlobalLeaderboard = async () => {
  try {
    const snapshot = await get(ref(database, 'leaderboard'));
    const allScores = [];
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      // Flatten all user scores
      Object.values(data).forEach(userScores => {
        if (userScores.scores) {
          Object.values(userScores.scores).forEach(score => {
            allScores.push(score);
          });
        }
      });
    }
    
    // Sort by score descending and take top 15
    allScores.sort((a, b) => b.score - a.score);
    return allScores.slice(0, 15);
  } catch (error) {
    console.error("Error fetching global leaderboard:", error);
    return [];
  }
};

// Get ALL public scores (for PDF export)
export const getAllPublicScores = async () => {
  try {
    const snapshot = await get(ref(database, 'leaderboard'));
    const allScores = [];
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      // Flatten all user scores
      Object.values(data).forEach(userScores => {
        if (userScores.scores) {
          Object.values(userScores.scores).forEach(score => {
            allScores.push(score);
          });
        }
      });
    }
    
    // Sort by score descending
    allScores.sort((a, b) => b.score - a.score);
    return allScores;
  } catch (error) {
    console.error("Error fetching all public scores:", error);
    return [];
  }
};

// Save user progression (which difficulties completed)
export const saveUserProgression = async (userId, completedDifficulties) => {
  try {
    await set(ref(database, `users/${userId}/progression`), {
      completed: completedDifficulties,
      updatedAt: new Date().toISOString()
    });
    return true;
  } catch (error) {
    console.error("Error saving user progression:", error);
    return false;
  }
};

// Get user progression
export const getUserProgression = async (userId) => {
  try {
    const snapshot = await get(ref(database, `users/${userId}/progression`));
    if (snapshot.exists()) {
      return snapshot.val().completed || ["easy"];
    }
    return ["easy"]; // Default: easy is always unlocked
  } catch (error) {
    console.error("Error fetching user progression:", error);
    return ["easy"];
  }
};
