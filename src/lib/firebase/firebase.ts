import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, memoryLocalCache } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { firebaseConfig } from './config';

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase services
export const auth = getAuth(app);

// Initialize Firestore with memory-only cache (no IndexedDB persistence)
// This prevents INTERNAL ASSERTION FAILED errors related to corrupted IndexedDB cache
// Use try-catch to handle HMR scenarios where Firestore might already be initialized
let firestoreInstance;
try {
    firestoreInstance = initializeFirestore(app, {
        localCache: memoryLocalCache()
    });
} catch (error: any) {
    // Firestore already initialized (e.g., during HMR)
    // Just get the existing instance
    const { getFirestore } = require('firebase/firestore');
    firestoreInstance = getFirestore(app);
    console.log('Using existing Firestore instance');
}

export const db = firestoreInstance;
export const storage = getStorage(app);

export default app;
