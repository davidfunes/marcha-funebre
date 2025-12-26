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
 * Robustly clean a PEM key
 * Handles multiline, literal \n, quotes, and hidden whitespace.
 */
function cleanPemKey(key: string): string {
    if (!key) return '';

    let cleaned = key.trim();

    // 1. Remove surrounding quotes (handles both single and double, even if mixed)
    cleaned = cleaned.replace(/^['"]|['"]$/g, '');

    // 2. Handle literal \n or \r\n characters
    cleaned = cleaned.replace(/\\n/g, '\n').replace(/\\r/g, '');

    // 3. Extract the PEM block to remove any leading/trailing garbage
    const beginHeader = '-----BEGIN PRIVATE KEY-----';
    const endHeader = '-----END PRIVATE KEY-----';

    if (cleaned.includes(beginHeader) && cleaned.includes(endHeader)) {
        const start = cleaned.indexOf(beginHeader);
        const end = cleaned.indexOf(endHeader) + endHeader.length;
        cleaned = cleaned.substring(start, end).trim();
    }

    // 4. Final sanity check: ensure no spaces after line breaks within the PEM body
    // This is a common cause of ASN.1 parsing errors
    cleaned = cleaned.split('\n').map(line => line.trim()).filter(line => line.length > 0).join('\n');

    return cleaned;
}
