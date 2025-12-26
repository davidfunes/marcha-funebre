import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    console.log('--- API /api/test-resend: request received ---');
    try {
        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: 'RESEND_API_KEY missing' }, { status: 500 });
        }

        const resend = new Resend(apiKey);
        return NextResponse.json({
            status: 'ok',
            message: 'Resend initialized successfully',
            apiKeyDefined: !!apiKey,
            apiKeyPrefix: apiKey.substring(0, 5)
        });
    } catch (error: any) {
        return NextResponse.json({
            status: 'error',
            message: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}
