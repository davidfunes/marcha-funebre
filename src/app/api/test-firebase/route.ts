import { NextResponse } from 'next/server';
import admin from 'firebase-admin';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    console.log('--- API /api/test-firebase: request received ---');
    try {
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
        let privateKey = process.env.FIREBASE_PRIVATE_KEY;

        if (privateKey) {
            privateKey = privateKey.replace(/\\n/g, '\n');
        }

        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                    clientEmail: clientEmail,
                    privateKey: privateKey,
                }),
            });
        }

        const db = admin.firestore();
        const usersCount = (await db.collection('users').limit(1).get()).size;

        return NextResponse.json({
            status: 'ok',
            message: 'Firebase Admin initialized manually',
            usersCount: usersCount,
            hasPrivateKey: !!privateKey,
            privateKeyIncludesBegin: privateKey?.includes('BEGIN PRIVATE KEY')
        });
    } catch (error: any) {
        return NextResponse.json({
            status: 'error',
            message: error.message,
            stack: error.stack,
            errorName: error.name
        }, { status: 500 });
    }
}
