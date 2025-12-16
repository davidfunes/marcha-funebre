'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import {
    Gamepad2,
    Ghost,
    ArrowLeft,
    Trophy
} from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export default function GamesMenuPage() {
    const { user } = useAuth();

    return (
        <div className="min-h-screen bg-background text-foreground">
            {/* Header */}
            <div className="bg-card/50 backdrop-blur-sm border-b border-border p-4 flex items-center gap-4 sticky top-0 z-10">
                <Link href="/driver/dashboard" className="p-2 -ml-2 hover:bg-accent rounded-full transition-colors">
                    <ArrowLeft className="w-6 h-6" />
                </Link>
                <div className="flex-1">
                    <h1 className="text-xl font-bold font-display flex items-center gap-2">
                        <Gamepad2 className="w-6 h-6 text-primary" />
                        Zona de Descanso
                    </h1>
                </div>
                <div className="flex items-center gap-3">
                    <ThemeToggle />
                    <div className="flex items-center gap-2 bg-yellow-500/20 px-3 py-1 rounded-full border border-yellow-500/30">
                        <Trophy className="w-4 h-4 text-yellow-500" />
                        <span className="font-bold text-yellow-500">{user?.points || 0}</span>
                    </div>
                </div>
            </div>

            <main className="p-4 max-w-lg mx-auto space-y-6 pt-8">
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold mb-2">¡Tómate un respiro!</h2>
                    <p className="text-muted-foreground">Relájate unos minutos antes de volver a la ruta.</p>
                </div>

                <div className="grid grid-cols-1 gap-6">
                    {/* Snake Card */}
                    <Link
                        href="/driver/games/snake"
                        className="group relative overflow-hidden bg-gradient-to-br from-green-900/50 to-emerald-900/50 border border-green-500/30 rounded-2xl p-6 hover:scale-[1.02] transition-all duration-300 shadow-lg hover:shadow-green-500/20"
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Gamepad2 className="w-32 h-32 text-green-500" />
                        </div>
                        <div className="relative z-10 flex items-center gap-4">
                            <div className="w-16 h-16 rounded-xl bg-green-500/20 flex items-center justify-center border border-green-500/30 group-hover:bg-green-500/30 transition-colors">
                                <div className="text-3xl">🐍</div>
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-foreground mb-1">Snake</h3>
                                <p className="text-green-200/70 text-sm">El clásico inmortal. ¡Come y crece!</p>
                            </div>
                        </div>
                    </Link>

                    {/* Pacman Card */}
                    <Link
                        href="/driver/games/pacman"
                        className="group relative overflow-hidden bg-gradient-to-br from-yellow-900/50 to-amber-900/50 border border-yellow-500/30 rounded-2xl p-6 hover:scale-[1.02] transition-all duration-300 shadow-lg hover:shadow-yellow-500/20"
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Ghost className="w-32 h-32 text-yellow-500" />
                        </div>
                        <div className="relative z-10 flex items-center gap-4">
                            <div className="w-16 h-16 rounded-xl bg-yellow-500/20 flex items-center justify-center border border-yellow-500/30 group-hover:bg-yellow-500/30 transition-colors">
                                <div className="text-3xl">👻</div>
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-foreground mb-1">Pac-Man</h3>
                                <p className="text-yellow-200/70 text-sm">Escapa de los fantasmas y come puntos.</p>
                            </div>
                        </div>
                    </Link>
                </div>
            </main>
        </div>
    );
}
