import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    return NextResponse.json({
        status: 'ok',
        message: 'API is alive',
        timestamp: new Date().toISOString(),
        envKeys: Object.keys(process.env).filter(k => k.includes('FIREBASE') || k.includes('NEXT_PUBLIC'))
    });
}
