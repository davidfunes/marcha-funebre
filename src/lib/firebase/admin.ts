import "server-only";
import admin from 'firebase-admin';

/**
 * Lazy initialization of Firebase Admin to avoid conflicts in serverless environments.
 * Uses a named app if the default app is already initialized by the framework.
 */
export function getAdminApp() {
    const APP_NAME = 'marcha-funebre-admin';

    // Check if the specific named app already exists
    const existingApp = admin.apps.find(app => app?.name === APP_NAME);
    if (existingApp) return existingApp;

    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!clientEmail || !privateKey) {
        console.warn('Firebase Admin: Missing credentials. This is expected during build or if server-side features are not needed.');
        return null;
    }

    try {
        // Robust cleaning of private key
        privateKey = privateKey.trim();
        if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
            privateKey = privateKey.substring(1, privateKey.length - 1);
        }
        privateKey = privateKey.replace(/\\n/g, '\n');

        if (!privateKey.includes('BEGIN PRIVATE KEY')) {
            console.error('Firebase Admin: Private key is present but malformed (missing BEGIN PRIVATE KEY header).');
            return null;
        }

        return admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                clientEmail: clientEmail,
                privateKey: privateKey,
            }),
        }, APP_NAME);
    } catch (error: any) {
        console.error('Firebase Admin Lazy Initialization Error:', error.message);
        return null;
    }
}

/**
 * Helper to get the Admin Firestore instance
 */
export function getAdminDb() {
    const app = getAdminApp();
    return app ? admin.firestore(app) : null;
}

/**
 * Helper to get the Admin Auth instance
 */
export function getAdminAuth() {
    const app = getAdminApp();
    return app ? admin.auth(app) : null;
}

// Legacy exports for better compatibility with existing code during transition
export const adminDb = getAdminDb();
export const adminAuth = getAdminAuth();
