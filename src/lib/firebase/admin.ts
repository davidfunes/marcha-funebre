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
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
        throw new Error(`Missing credentials: projectId=${!!projectId}, clientEmail=${!!clientEmail}, privateKey=${!!privateKey}`);
    }

    const cleanedKey = cleanPemKey(privateKey);

    if (!cleanedKey.includes('BEGIN PRIVATE KEY')) {
        throw new Error(`Malformed private key: length=${cleanedKey.length}, prefix=${cleanedKey.substring(0, 20)}`);
    }

    try {
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

/**
 * The Ultimate PEM Reconstructor.
 * Strips everything except the raw base64 and wraps it in fresh headers.
 */
function cleanPemKey(key: string): string {
    if (!key) return '';

    // 1. Remove all quotes and normalize newlines/escapes
    let raw = key.trim()
        .replace(/^['"]|['"]$/g, '')
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '');

    const beginHeader = '-----BEGIN PRIVATE KEY-----';
    const endHeader = '-----END PRIVATE KEY-----';

    // 2. Extract base64 content
    if (raw.includes(beginHeader) && raw.includes(endHeader)) {
        const start = raw.indexOf(beginHeader) + beginHeader.length;
        const end = raw.indexOf(endHeader);
        raw = raw.substring(start, end);
    }

    // 3. Strip all whitespace, newlines, and non-base64 characters from the body
    // This is the "nuclear option" to ensure no junk remains
    const cleanBody = raw.replace(/[^A-Za-z0-9+/=]/g, '');

    // 4. Reconstruct with standard 64-character lines (most compatible format)
    const lines = [];
    for (let i = 0; i < cleanBody.length; i += 64) {
        lines.push(cleanBody.substring(i, i + 64));
    }

    return `${beginHeader}\n${lines.join('\n')}\n${endHeader}`;
}
