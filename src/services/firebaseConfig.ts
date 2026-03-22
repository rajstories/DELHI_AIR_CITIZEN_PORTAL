import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  databaseURL: "https://delhi-citizen-app-default-rtdb.firebaseio.com",
  projectId: "delhi-citizen-app",
  storageBucket: "delhi-citizen-app.appspot.com",
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
};

const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);
export const storage = getStorage(app);
export default app;
