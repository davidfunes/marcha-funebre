import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const db = getAdminDb();
        if (!db) {
            return NextResponse.json({
                status: 'error',
                message: 'Admin DB could not be initialized'
            }, { status: 500 });
        }

        const usersCount = (await db.collection('users').limit(1).get()).size;

        return NextResponse.json({
            status: 'ok',
            message: 'Firebase Admin initialized via getAdminDb()',
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
