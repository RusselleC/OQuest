import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
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
