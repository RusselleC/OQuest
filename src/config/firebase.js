import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCoXG64zCIVOjwU2haBt9sMAlgc_NQoCXE",
  authDomain: "oquest-ndmc-142bf.firebaseapp.com",
  databaseURL: "https://oquest-ndmc-142bf-default-rtdb.firebaseio.com",
  projectId: "oquest-ndmc-142bf",
  storageBucket: "oquest-ndmc-142bf.firebasestorage.app",
  messagingSenderId: "659241437784",
  appId: "1:659241437784:web:8dc1df40c21f8d8b81d82d"
};

try {
  initializeApp(firebaseConfig);
  const auth = getAuth();
  if (!auth.currentUser) {
    signInAnonymously(auth).catch(e => console.warn("Anonymous auth skipped:", e.message));
  }
} catch(e) {
  console.warn("Firebase already initialized or config issue:", e.message);
}

export { firebaseConfig };
