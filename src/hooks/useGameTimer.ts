import { useEffect, useRef } from 'react';
import { db } from '@/lib/firebase/firebase';
import { logPoints } from '@/services/GamificationService';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook to award 1 point for every minute spent in a component.
 * @param isActive If true, the timer runs. Defaults to true.
 */
export function useGameTimer(isActive: boolean = true) {
    const { user } = useAuth();
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!user || !isActive) {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            return;
        }

        // Run every 60 seconds (60000 ms)
        intervalRef.current = setInterval(async () => {
            if (user.id) {
                try {
                    await logPoints(user.id, 1, 'game_time_1min');
                    console.log('Awarded 1 point for 1 minute of game time.');
                } catch (error) {
                    console.error('Error awarding game point:', error);
                }
            }
        }, 60000);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [user, isActive]);
}
