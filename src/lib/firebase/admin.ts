import "server-only";
import admin from 'firebase-admin';

// Check if app is already initialized
if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            }),
        });
        console.log('Firebase Admin Initialized');
    } catch (error: any) {
        console.error('Firebase Admin Initialization Error:', error.stack);
    }
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
