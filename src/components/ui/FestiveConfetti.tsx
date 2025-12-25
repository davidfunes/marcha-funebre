'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { isChristmasTime } from '@/utils/dateUtils';

const FESTIVE_ICONS = ['🎄', '🎁', '❄️', '⭐', '🎅', '🦌', '🔥'];

export function FestiveConfetti() {
    const [icons, setIcons] = useState<{ id: number; icon: string; x: string; xTarget: string; duration: number; delay: number }[]>([]);
    const isChristmas = isChristmasTime();

    useEffect(() => {
        const generateIcons = () => {
            const newIcons = Array.from({ length: 30 }).map((_, i) => ({
                id: i,
                icon: FESTIVE_ICONS[Math.floor(Math.random() * FESTIVE_ICONS.length)],
                x: `${Math.random() * 100}vw`,
                xTarget: `${(Math.random() * 100) + (Math.random() * 50 - 25)}vw`,
                duration: 3 + Math.random() * 3,
                delay: Math.random() * 2
            }));
            setIcons(newIcons);
        };

        generateIcons();
    }, []);

    if (!isChristmas) return null;

    return (
        <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
            <AnimatePresence>
                {icons.map((item) => (
                    <motion.div
                        key={item.id}
                        initial={{ y: -50, x: item.x, opacity: 0, rotate: 0 }}
                        animate={{
                            y: '110vh',
                            opacity: [0, 1, 1, 0],
                            rotate: 360,
                            x: item.xTarget
                        }}
                        transition={{
                            duration: item.duration,
                            delay: item.delay,
                            ease: "easeOut"
                        }}
                        className="absolute text-2xl"
                    >
                        {item.icon}
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}
