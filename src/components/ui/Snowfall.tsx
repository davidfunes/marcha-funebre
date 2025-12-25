'use client';

import React, { useEffect, useState } from 'react';
import { isChristmasTime } from '@/utils/dateUtils';

export function Snowfall() {
    const [flakes, setFlakes] = useState<{ id: number; left: string; delay: string; duration: string; size: string }[]>([]);
    const isChristmas = isChristmasTime();

    useEffect(() => {
        if (!isChristmas) return;

        // Generate a fixed set of flakes once on mount to avoid hydration mismatches
        const newFlakes = Array.from({ length: 20 }).map((_, i) => ({
            id: i,
            left: `${Math.random() * 100}vw`,
            delay: `${Math.random() * 10}s`,
            duration: `${10 + Math.random() * 20}s`,
            size: `${Math.random() * 10 + 5}px`
        }));
        setFlakes(newFlakes);
    }, [isChristmas]);

    if (!isChristmas) return null;

    return (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-[5]" aria-hidden="true">
            {flakes.map((flake) => (
                <div
                    key={flake.id}
                    className="snow-flake"
                    style={{
                        left: flake.left,
                        animationDelay: flake.delay,
                        animationDuration: flake.duration,
                        width: flake.size,
                        height: flake.size,
                        backgroundColor: 'white',
                        borderRadius: '50%',
                        filter: 'blur(1px)'
                    }}
                />
            ))}
        </div>
    );
}
