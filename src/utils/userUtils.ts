import { User } from '@/types';

/**
 * Get the full name of a user
 * @param user - User object
 * @returns Formatted full name
 */
export const getFullName = (user: User | Partial<User> | null | undefined): string => {
    if (!user) return 'Usuario';

    const parts = [
        user.name,
        user.firstSurname,
        user.secondSurname
    ].filter(part => !!part && part.trim() !== '');

    return parts.length > 0 ? parts.join(' ') : (user.email || 'Usuario');
};

/**
 * Get the initials of a user
 * @param user - User object
 * @returns Formatted initials
 */
export const getUserInitials = (user: User | Partial<User> | null | undefined): string => {
    if (!user || !user.name) return '?';

    const firstInitial = user.name.charAt(0).toUpperCase();
    const surnameInitial = user.firstSurname ? user.firstSurname.charAt(0).toUpperCase() : '';

    return firstInitial + surnameInitial;
};
