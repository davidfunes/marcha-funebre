import "server-only";
import admin from 'firebase-admin';

const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n').replace(/"/g, '');

let appInitialized = false;

// Check if app is already initialized and we have credentials
if (!admin.apps.length && clientEmail && privateKey) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                clientEmail: clientEmail,
                privateKey: privateKey,
            }),
        });
        console.log('Firebase Admin Initialized Successfully');
        appInitialized = true;
    } catch (error: any) {
        console.error('Firebase Admin Initialization Error:', error.message);
    }
} else if (admin.apps.length > 0) {
    appInitialized = true;
}

// Safely export services. If not initialized, these might throw on access, 
// so we provide a proxy or check if we are in build time.
export const adminAuth = appInitialized ? admin.auth() : null as any;
export const adminDb = appInitialized ? admin.firestore() : null as any;
