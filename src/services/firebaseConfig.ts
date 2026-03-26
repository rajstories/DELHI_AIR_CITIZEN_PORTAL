import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';
import { getAuth, signInAnonymously } from 'firebase/auth';

const firebaseConfig = {
  databaseURL: "https://delhi-citizen-app-default-rtdb.firebaseio.com",
  projectId: "delhi-citizen-app",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "delhi-citizen-app.appspot.com",
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
};

const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);
export const storage = getStorage(app);
export const auth = getAuth(app);

// Simple auto-sign-in for anonymous sessions
signInAnonymously(auth).catch(e => console.error("Firebase auth error:", e));

export default app;
