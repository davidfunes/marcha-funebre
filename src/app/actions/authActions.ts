'use server';

import { adminDb } from '@/lib/firebase/admin';

export async function blockUserByEmailAction(email: string) {
    try {
        if (!email) return { success: false, error: 'Email required' };

        console.log(`Attempting to block user via Server Action: ${email}`);

        // 1. Find user by email
        const usersRef = adminDb.collection('users');
        const snapshot = await usersRef.where('email', '==', email).limit(1).get();

        if (snapshot.empty) {
            console.log(`User not found for blocking: ${email}`);
            return { success: false, error: 'User not found' };
        }

        // 2. Update status to blocked
        const doc = snapshot.docs[0];
        await doc.ref.update({
            status: 'blocked',
            updatedAt: new Date() // Use server date
        });

        console.log(`User ${email} (ID: ${doc.id}) has been blocked by system.`);
        return { success: true };

    } catch (error: any) {
        console.error('Error in blockUserByEmailAction:', error);
        return { success: false, error: error.message };
    }
}
