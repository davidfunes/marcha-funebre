import { User } from '@/types';

/**
 * Calculate profile completion percentage based on filled fields
 * @param user - User object
 * @returns Completion percentage (0-100)
 */
export const calculateProfileCompletion = (user: User | null): number => {
    if (!user) return 0;

    const fields = {
        name: user.name ? 30 : 0,
        firstSurname: user.firstSurname ? 30 : 0,
        secondSurname: user.secondSurname ? 20 : 0,
        avatar: user.avatar ? 20 : 0,
    };

    return Object.values(fields).reduce((sum, value) => sum + value, 0);
};

/**
 * Check if user profile has essential fields completed
 * @param user - User object
 * @returns true if profile is complete, false otherwise
 */
export const isProfileComplete = (user: User | null): boolean => {
    if (!user) return false;

    // Essential fields that must be filled
    const hasName = !!user.name && user.name.trim() !== '';
    const hasFirstSurname = !!user.firstSurname && user.firstSurname.trim() !== '';

    return hasName && hasFirstSurname;
};
