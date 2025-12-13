import { useEffect, useRef } from 'react';
import { db } from '@/lib/firebase/firebase';
import { doc, updateDoc, increment } from 'firebase/firestore';
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
                    await updateDoc(doc(db, 'users', user.id), {
                        points: increment(1)
                    });
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
