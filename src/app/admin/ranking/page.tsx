'use client';

import { RankingBoard } from '@/components/gamification/RankingBoard';

export default function AdminRankingPage() {
    return (
        <div className="p-8 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Ranking de Conductores</h1>
                    <p className="text-muted-foreground mt-2">Seguimiento de rendimiento y gamificación de la flota.</p>
                </div>
            </div>

            <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
                <RankingBoard />
            </div>
        </div>
    );
}
