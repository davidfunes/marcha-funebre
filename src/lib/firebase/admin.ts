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

    const { cleanedKey, diagnostics } = cleanPemKeyWithDiagnostics(privateKey);

    if (!cleanedKey.includes('BEGIN PRIVATE KEY')) {
        throw new Error(`Malformed private key: ${JSON.stringify(diagnostics)}`);
    }

    try {
        // console.log('--- Firebase Admin Diagnostic ---');
        // console.log('Project ID:', projectId);
        // console.log('Client Email:', clientEmail);
        // console.log('Key Length:', cleanedKey.length);
        // console.log('Key Diagnostics:', JSON.stringify(diagnostics));

        return admin.initializeApp({
            credential: admin.credential.cert({
                projectId,
                clientEmail,
                privateKey: cleanedKey,
            }),
        }, APP_NAME);
    } catch (error: any) {
        throw new Error(`Firebase Admin SDK Initialization Error: ${error.message}. Diagnostics: ${JSON.stringify(diagnostics)}`);
    }
}

/**
 * Enhanced cleaning with diagnostics
 */
function cleanPemKeyWithDiagnostics(key: string) {
    const diagnostics: any = {
        originalLength: key.length,
        hasBegin: key.includes('-----BEGIN PRIVATE KEY-----'),
        hasEnd: key.includes('-----END PRIVATE KEY-----'),
    };

    let raw = key.trim()
        .replace(/^['"]|['"]$/g, '')
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '');

    const beginHeader = '-----BEGIN PRIVATE KEY-----';
    const endHeader = '-----END PRIVATE KEY-----';

    if (raw.includes(beginHeader) && raw.includes(endHeader)) {
        const start = raw.indexOf(beginHeader) + beginHeader.length;
        const end = raw.indexOf(endHeader);
        raw = raw.substring(start, end);
    }

    const cleanBody = raw.replace(/[^A-Za-z0-9+/=]/g, '');
    diagnostics.cleanBodyLength = cleanBody.length;
    diagnostics.bodySample = cleanBody.substring(0, 10) + '...' + cleanBody.substring(cleanBody.length - 10);

    const lines = [];
    for (let i = 0; i < cleanBody.length; i += 64) {
        lines.push(cleanBody.substring(i, i + 64));
    }

    const cleanedKey = `${beginHeader}\n${lines.join('\n')}\n${endHeader}`;
    return { cleanedKey, diagnostics };
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

