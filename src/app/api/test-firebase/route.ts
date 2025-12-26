import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        let db;
        try {
            db = getAdminDb();
            if (!db) throw new Error('getAdminDb() returned null without throwing');
        } catch (initError: any) {
            return NextResponse.json({
                status: 'error',
                message: 'Database initialization failed',
                details: initError.message
            }, { status: 500 });
        }

        const usersCount = (await db.collection('users').limit(1).get()).size;

        return NextResponse.json({
            status: 'ok',
            message: 'Firebase Admin initialized successfully',
            usersCount: usersCount
        });
    } catch (error: any) {
        return NextResponse.json({
            status: 'error',
            message: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}
