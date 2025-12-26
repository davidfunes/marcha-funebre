import "server-only";
import admin from 'firebase-admin';

const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
let privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (privateKey) {
    // 1. Remove any surrounding quotes
    privateKey = privateKey.trim();
    if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
        privateKey = privateKey.substring(1, privateKey.length - 1);
    }
    // 2. Handle literal \n or actual multiline
    privateKey = privateKey.replace(/\\n/g, '\n');
}

let appInitialized = false;

// Check if app is already initialized and we have credentials
if (!admin.apps.length && clientEmail && privateKey && privateKey.includes('BEGIN PRIVATE KEY')) {
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
} else if (!clientEmail || !privateKey) {
    console.warn('Firebase Admin: Missing credentials. This is normal during build if not accessing server-side data.');
}

// Safely export services.
export const adminAuth = appInitialized ? admin.auth() : null as any;
export const adminDb = appInitialized ? admin.firestore() : null as any;
export const isConfigured = appInitialized;
