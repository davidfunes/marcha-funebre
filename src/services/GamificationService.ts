import { db } from '@/lib/firebase/firebase';
import { collection, addDoc, updateDoc, doc, increment, serverTimestamp, query, where, getDocs, Timestamp, getDoc, setDoc } from 'firebase/firestore';
import { User } from '@/types';

export type RankingPeriod = 'week' | 'month' | 'year' | 'all';

export interface RankingUser {
    userId: string;
    points: number;
    user?: User; // Hydrated user data
}

export interface RankInfo {
    name: string;
    minPoints: number;
    color: string;
    icon: string; // Lucide icon name or emoji
}

export const RANKS: RankInfo[] = [
    { name: 'Novato', minPoints: 0, color: 'text-slate-400', icon: 'medal' },
    { name: 'Profesional', minPoints: 501, color: 'text-blue-400', icon: 'shield' },
    { name: 'Especialista', minPoints: 2001, color: 'text-purple-400', icon: 'zap' },
    { name: 'Veterano', minPoints: 5001, color: 'text-orange-400', icon: 'award' },
    { name: 'Maestro de Flota', minPoints: 10001, color: 'text-emerald-400', icon: 'star' },
    { name: 'Leyenda de la Carretera', minPoints: 25001, color: 'text-pink-400', icon: 'crown' },
    { name: 'Centinela', minPoints: 50001, color: 'text-yellow-400', icon: 'trophy' },
];

export interface GamificationConfig {
    actions: {
        checklist_completed: number;
        log_km: number;
        log_fuel: number;
        game_time_1min: number;
        incident_reported: number;
        // Specific wash types
        wash_exterior: number;
        wash_interior: number;
        wash_complete: number;
        tire_pressure_log: number;
        // Legacy/General
        vehicle_wash: number;
    };
    updatedAt: any;
    updatedBy?: string;
}

const DEFAULT_CONFIG: GamificationConfig = {
    actions: {
        checklist_completed: 1, // Reduced as requested
        incident_reported: 5,   // Reduced as requested
        wash_exterior: 100,
        wash_interior: 100,
        wash_complete: 200,
        log_km: 10,
        log_fuel: 10,
        game_time_1min: 1,
        tire_pressure_log: 50, // Updated from 20 to 50 as requested
        vehicle_wash: 15 // Legacy default
    },
    updatedAt: null
};

export const getGamificationConfig = async (): Promise<GamificationConfig> => {
    try {
        const docRef = doc(db, 'settings', 'gamification');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data() as GamificationConfig;
            // Merge actions with defaults to ensure new keys exist
            return {
                ...data,
                actions: {
                    ...DEFAULT_CONFIG.actions,
                    ...data.actions
                }
            };
        } else {
            // Seed default if not exists
            await setDoc(docRef, {
                ...DEFAULT_CONFIG,
                updatedAt: serverTimestamp()
            });
            return DEFAULT_CONFIG;
        }
    } catch (error) {
        console.error('[Gamification] Error getting config:', error);
        return DEFAULT_CONFIG; // Fallback
    }
};

export const updateGamificationConfig = async (newConfig: Partial<GamificationConfig['actions']>, userId: string) => {
    try {
        const docRef = doc(db, 'settings', 'gamification');
        await setDoc(docRef, {
            actions: newConfig,
            updatedAt: serverTimestamp(),
            updatedBy: userId
        }, { merge: true });
        console.log('[Gamification] Config updated');
    } catch (error) {
        console.error('[Gamification] Error updating config:', error);
        throw error;
    }
};

export const awardPointsForAction = async (userId: string, actionKey: keyof GamificationConfig['actions'], customReason?: string) => {
    try {
        const config = await getGamificationConfig();
        const points = config.actions[actionKey] || 0;

        if (points > 0) {
            await logPoints(userId, points, customReason || actionKey);
            return points;
        }
        return 0;
    } catch (error) {
        console.error(`[Gamification] Error awarding points for ${actionKey}:`, error);
        // Fallback to defaults if config fails completely?
        // Better to fail safe and maybe log 0 or retry. Using default const for now.
        const fallbackPoints = DEFAULT_CONFIG.actions[actionKey] || 0;
        if (fallbackPoints > 0) {
            await logPoints(userId, fallbackPoints, customReason || actionKey);
            return fallbackPoints;
        }
    }
};

/**
 * Gets the current rank based on points
 */
export const getUserRank = (points: number): RankInfo => {
    // Find the highest rank whose minPoints is <= current points
    const currentRank = [...RANKS].reverse().find(r => points >= r.minPoints);
    return currentRank || RANKS[0];
};

/**
 * Calculates progress to the next rank
 * @returns { progress: number, nextRank: RankInfo | null, pointsToNext: number }
 */
export const getNextRankProgress = (points: number) => {
    const currentRankIndex = [...RANKS].findIndex((r, i) => {
        const nextRank = RANKS[i + 1];
        return points >= r.minPoints && (!nextRank || points < nextRank.minPoints);
    });

    const currentRank = RANKS[currentRankIndex] || RANKS[0];
    const nextRank = RANKS[currentRankIndex + 1];

    if (!nextRank) {
        return { progress: 100, nextRank: null, pointsToNext: 0 };
    }

    const range = nextRank.minPoints - currentRank.minPoints;
    const currentInRange = points - currentRank.minPoints;
    const progress = Math.min(100, Math.max(0, (currentInRange / range) * 100));

    return {
        progress,
        nextRank,
        pointsToNext: nextRank.minPoints - points
    };
};

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
        // Use setDoc with merge to ensure the field is created if missing
        await setDoc(doc(db, 'users', userId), {
            points: increment(points)
        }, { merge: true });

        console.log(`[Gamification] User ${userId} points incremented by ${points} pts for ${reason}`);
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
                const day = now.getDay();
                const diff = now.getDate() - day + (day === 0 ? -6 : 1);
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
                const usersSnap = await getDocs(collection(db, 'users'));
                return usersSnap.docs
                    .map(d => ({ userId: d.id, points: d.data().points || 0, user: { id: d.id, ...d.data() } as User }))
                    .filter(u => u.points > 0 && u.user.role !== 'admin') // Filter out admins
                    .sort((a, b) => b.points - a.points);
        }

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

        const ranking: RankingUser[] = Object.entries(pointsMap).map(([userId, points]) => ({
            userId,
            points
        }));

        const top50 = ranking.sort((a, b) => b.points - a.points).slice(0, 50);

        const hydratedRanking = await Promise.all(top50.map(async (item) => {
            const userDoc = await getDoc(doc(db, 'users', item.userId));
            if (userDoc.exists()) {
                const userData = userDoc.data() as User;
                // Exclude admins from temporal ranking as well
                if (userData.role !== 'admin') {
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
