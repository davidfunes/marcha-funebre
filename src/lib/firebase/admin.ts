import "server-only";
import admin from 'firebase-admin';

const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

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
    } catch (error: any) {
        console.error('Firebase Admin Initialization Error:', error.message);
    }
} else if (!clientEmail || !privateKey) {
    console.warn('Firebase Admin credentials missing. Skipping initialization (expected during build if not needed).');
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
