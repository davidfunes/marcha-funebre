import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatLicensePlate(input: string): string {
    // Remove non-alphanumeric characters and convert to uppercase
    const clean = input.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

    // Standard Spanish format: 4 digits + 3 letters (0000 BBB)
    if (clean.length > 4) {
        const numbers = clean.substring(0, 4);
        const letters = clean.substring(4, 7);
        // Only add space if we have letters
        return letters ? `${numbers} ${letters}` : numbers;
    }

    return clean;
}

export function formatPhoneNumber(input: string): string {
    // 1. Remove all non-numeric characters (keep + if at start, but we'll re-add it)
    let clean = input.replace(/[^0-9]/g, '');

    // 2. Handle country code (Spain +34)
    // If it starts with 34, strip it to process the rest, then re-add
    if (clean.startsWith('34')) {
        clean = clean.substring(2);
    }

    // 3. Limit to 9 digits (Spanish numbers)
    if (clean.length > 9) {
        clean = clean.substring(0, 9);
    }

    // 4. Format groups: +34 XXX XX XX XX
    let formatted = '';
    if (clean.length > 0) {
        formatted = '+34 ';
        if (clean.length > 0) formatted += clean.substring(0, 3);
        if (clean.length > 3) formatted += ' ' + clean.substring(3, 5);
        if (clean.length > 5) formatted += ' ' + clean.substring(5, 7);
        if (clean.length > 7) formatted += ' ' + clean.substring(7, 9);
    }

    return formatted.trim();
}

export function getFuelLevelLabel(level: string | undefined): string {
    if (!level) return 'No reportado';
    const mapping: Record<string, string> = {
        '100': 'Lleno (100%)',
        '75': '3/4',
        '50': 'Medio (50%)',
        '25': '1/4',
        '10': 'Casi Reserva',
        '0': 'Reserva (!)'
    };
    return mapping[level] || 'Desconocido';
}
