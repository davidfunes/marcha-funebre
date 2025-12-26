"use client";

import { useState, useEffect } from 'react';
import { isChristmasTime } from '@/utils/dateUtils';
import { christmasStore } from '@/utils/christmasStore';

export function useChristmas() {
    const [isChristmasActive, setIsChristmasActive] = useState(false);

    useEffect(() => {
        const checkChristmas = () => {
            const isTime = isChristmasTime();
            const isDisabled = christmasStore.isDisabled();
            setIsChristmasActive(isTime && !isDisabled);
        };

        // Initial check
        checkChristmas();

        // Listen for preference changes
        window.addEventListener('christmas-preference-changed', checkChristmas);

        return () => {
            window.removeEventListener('christmas-preference-changed', checkChristmas);
        };
    }, []);

    return isChristmasActive;
}
