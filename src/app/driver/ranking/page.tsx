'use client';

import Link from 'next/link';
import { RankingBoard } from '@/components/gamification/RankingBoard';
import { ArrowLeft, Trophy } from 'lucide-react';

export default function DriverRankingPage() {
    return (
        <div className="min-h-screen bg-background text-foreground pb-20">
            {/* Header */}
            <div className="bg-card border-b border-border p-4 flex items-center gap-4 sticky top-0 z-10">
                <Link href="/driver/games" className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors">
                    <ArrowLeft className="w-6 h-6" />
                </Link>
                <div className="flex-1">
                    <h1 className="text-xl font-bold font-display flex items-center gap-2">
                        <Trophy className="w-6 h-6 text-yellow-500" />
                        Ranking de Conductores
                    </h1>
                </div>
            </div>

            <main className="p-4 max-w-lg mx-auto">
                <div className="mb-6 text-center">
                    <h2 className="text-2xl font-bold">Salón de la Fama</h2>
                    <p className="text-muted-foreground">¡Compite sanamente y demuestra tu profesionalidad!</p>
                </div>

                <RankingBoard />
            </main>
        </div>
    );
}
