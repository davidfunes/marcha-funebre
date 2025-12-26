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

    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
        throw new Error(`Missing credentials: projectId=${!!projectId}, clientEmail=${!!clientEmail}, privateKey=${!!privateKey}`);
    }

    try {
        // Robust cleaning of private key
        let cleanedKey = privateKey.trim();
        if (cleanedKey.startsWith('"') && cleanedKey.endsWith('"')) {
            cleanedKey = cleanedKey.substring(1, cleanedKey.length - 1);
        }
        cleanedKey = cleanedKey.replace(/\\n/g, '\n');

        if (!cleanedKey.includes('BEGIN PRIVATE KEY')) {
            throw new Error(`Malformed private key: length=${cleanedKey.length}, prefix=${cleanedKey.substring(0, 20)}`);
        }

        return admin.initializeApp({
            credential: admin.credential.cert({
                projectId,
                clientEmail,
                privateKey: cleanedKey,
            }),
        }, APP_NAME);
    } catch (error: any) {
        throw new Error(`Firebase Admin SDK Initialization Error: ${error.message}`);
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
