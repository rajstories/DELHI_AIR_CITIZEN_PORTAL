import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';
import { getAuth, signInAnonymously } from 'firebase/auth';

/**
 * NEW FIREBASE CONFIGURATION
 * Using environment variables for better security and portability.
 * Ensure these are set in your .env file or Vercel environment settings.
 */
const firebaseConfig = {
  apiKey:             import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:         import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "delhi-citizen-app.firebaseapp.com",
  databaseURL:        import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://delhi-citizen-app-default-rtdb.firebaseio.com",
  projectId:          import.meta.env.VITE_FIREBASE_PROJECT_ID || "delhi-citizen-app",
  storageBucket:      import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "delhi-citizen-app.appspot.com",
  messagingSenderId:  import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:              import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId:      import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);
export const storage = getStorage(app);
export const auth = getAuth(app);

// Simple auto-sign-in for anonymous sessions to handle RTDB security rules
signInAnonymously(auth).catch(e => {
    console.error("[FirebaseConfig] Anonymous Auth Error:", e.message);
    if (e.code === 'auth/operation-not-allowed') {
        console.warn("[FirebaseConfig] ⚠️ Action Required: Enable 'Anonymous' provider in Firebase Console > Authentication > Sign-in method.");
    }
});

export default app;
