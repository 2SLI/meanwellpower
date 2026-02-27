import { getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';


const firebaseConfig = typeof window !== 'undefined' ? window.FIREBASE_CONFIG : null;
export const commonDetailImagePath = String(firebaseConfig?.commonDetailImagePath ?? '').trim();

export const isFirebaseConfigured = Boolean(firebaseConfig);

const app =
  isFirebaseConfigured && getApps().length === 0
    ? initializeApp(firebaseConfig)
    : getApps()[0] ?? null;

export const firebaseApp = app;
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
export const storage = app ? getStorage(app) : null;
