import { db } from '@/lib/firebase/firebase';
import { collection, addDoc, updateDoc, doc, increment, serverTimestamp, query, where, getDocs, Timestamp, getDoc } from 'firebase/firestore';
import { User } from '@/types';

export type RankingPeriod = 'week' | 'month' | 'year' | 'all';

export interface RankingUser {
    userId: string;
    points: number;
    user?: User; // Hydrated user data
}

export const logPoints = async (userId: string, points: number, reason: string) => {
    try {
        // 1. Add log entry
        await addDoc(collection(db, 'point_logs'), {
            userId,
            points,
            reason,
            createdAt: serverTimestamp()
        });

        // 2. Increment total points (keep existing field for overall legacy/simple view)
        await updateDoc(doc(db, 'users', userId), {
            points: increment(points)
        });

        console.log(`[Gamification] Awarded ${points} points to ${userId} for ${reason}`);
    } catch (error) {
        console.error('[Gamification] Error logging points:', error);
        throw error;
    }
};

export const getRanking = async (period: RankingPeriod): Promise<RankingUser[]> => {
    try {
        let startTime: Date | null = null;
        const now = new Date();

        switch (period) {
            case 'week':
                // Starts last Monday or 7 days ago? Usually "Current Week" implies Monday
                // Let's do simple "Last 7 days" for rolling window or "Start of Week"
                // Let's use Start of Week (Monday)
                const day = now.getDay(); // 0 (Sun) - 6 (Sat)
                const diff = now.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
                startTime = new Date(now.setDate(diff));
                startTime.setHours(0, 0, 0, 0);
                break;
            case 'month':
                startTime = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'year':
                startTime = new Date(now.getFullYear(), 0, 1);
                break;
            case 'all':
                // Query users collection directly for total points (more efficient)
                const usersSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'conductor')));
                return usersSnap.docs
                    .map(d => ({ userId: d.id, points: d.data().points || 0, user: { id: d.id, ...d.data() } as User }))
                    .sort((a, b) => b.points - a.points);
        }

        // For time periods, we must aggregate logs
        // Note: In a large scale app, we would use Cloud Functions to maintain counters.
        // For this scale, client-side aggregation of logs is acceptable but could be heavy.

        let q = query(collection(db, 'point_logs'));

        if (startTime) {
            q = query(collection(db, 'point_logs'), where('createdAt', '>=', Timestamp.fromDate(startTime)));
        }

        const logsSnap = await getDocs(q);
        const pointsMap: Record<string, number> = {};

        logsSnap.forEach(doc => {
            const data = doc.data();
            const uid = data.userId;
            const points = data.points || 0;
            pointsMap[uid] = (pointsMap[uid] || 0) + points;
        });

        // Convert to array
        const ranking: RankingUser[] = Object.entries(pointsMap).map(([userId, points]) => ({
            userId,
            points
        }));

        // Hydrate user data (could be optimized with a batch get or existing users list)
        // For now, let's fetch only the top 50 to avoid hammering
        const top50 = ranking.sort((a, b) => b.points - a.points).slice(0, 50);

        const hydratedRanking = await Promise.all(top50.map(async (item) => {
            const userDoc = await getDoc(doc(db, 'users', item.userId));
            if (userDoc.exists()) {
                const userData = userDoc.data() as User;
                // Double check role
                if (userData.role === 'conductor') {
                    return { ...item, user: { id: userDoc.id, ...userData } };
                }
            }
            return null;
        }));

        return hydratedRanking.filter(Boolean) as RankingUser[];

    } catch (error) {
        console.error('[Gamification] Error fetching ranking:', error);
        return [];
    }
};

export const backfillPoints = async () => {
    try {
        console.log('[Gamification] Starting backfill...');
        // 1. Get ALL users (removed role filter to be safe)
        const usersSnap = await getDocs(collection(db, 'users'));
        const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() } as User));

        let updatedCount = 0;
        let errorsCount = 0;

        for (const user of users) {
            try {
                const currentTotal = user.points || 0;
                if (currentTotal === 0) continue;

                // 2. Get logged points
                const logsSnap = await getDocs(query(collection(db, 'point_logs'), where('userId', '==', user.id)));
                let loggedTotal = 0;
                logsSnap.forEach(doc => {
                    loggedTotal += (doc.data().points || 0);
                });

                // 3. Diff
                const diff = currentTotal - loggedTotal;

                if (diff > 0) {
                    console.log(`[Gamification] Backfilling ${diff} points for user ${user.name} (${user.email})`);
                    // 4. Create log for diff
                    await addDoc(collection(db, 'point_logs'), {
                        userId: user.id,
                        points: diff,
                        reason: 'legacy_migration_2024_force',
                        createdAt: serverTimestamp()
                    });
                    updatedCount++;
                }
            } catch (err) {
                console.error(`[Gamification] Error processing user ${user.id}:`, err);
                errorsCount++;
            }
        }

        console.log(`[Gamification] Backfill complete. Updated: ${updatedCount}, Errors: ${errorsCount}`);
        return { updatedCount, errorsCount };
    } catch (error) {
        console.error('[Gamification] Error backfilling points:', error);
        throw error;
    }
};

export const debugUserGamification = async (email: string) => {
    try {
        const usersSnap = await getDocs(query(collection(db, 'users'), where('email', '==', email)));
        if (usersSnap.empty) return { error: 'User not found' };

        const userDoc = usersSnap.docs[0];
        const userData = userDoc.data() as User;
        const userId = userDoc.id;

        const logsSnap = await getDocs(query(collection(db, 'point_logs'), where('userId', '==', userId)));
        let loggedTotal = 0;
        const logs: any[] = [];
        logsSnap.forEach(doc => {
            const d = doc.data();
            loggedTotal += (d.points || 0);
            logs.push({ ...d, id: doc.id, date: d.createdAt?.toDate?.() });
        });

        return {
            user: { ...userData, id: userId },
            pointsMismatch: (userData.points || 0) - loggedTotal,
            loggedTotal,
            logsCount: logs.length,
            logsSample: logs.slice(0, 5)
        };
    } catch (error: any) {
        return { error: error.message };
    }
};

export const forceBackfillUser = async (email: string) => {
    try {
        const usersSnap = await getDocs(query(collection(db, 'users'), where('email', '==', email)));
        if (usersSnap.empty) throw new Error('Usuario no encontrado');

        const userDoc = usersSnap.docs[0];
        const user = { id: userDoc.id, ...userDoc.data() } as User;
        const currentTotal = user.points || 0;

        const logsSnap = await getDocs(query(collection(db, 'point_logs'), where('userId', '==', user.id)));
        let loggedTotal = 0;
        logsSnap.forEach(doc => { loggedTotal += (doc.data().points || 0); });

        const diff = currentTotal - loggedTotal;

        if (diff > 0) {
            await addDoc(collection(db, 'point_logs'), {
                userId: user.id,
                points: diff,
                reason: 'legacy_migration_manual_fix',
                createdAt: serverTimestamp()
            });
            return { success: true, diff };
        }
        return { success: false, message: 'No hay diferencia de puntos para corregir' };
    } catch (error: any) {
        throw new Error(error.message);
    }
};
