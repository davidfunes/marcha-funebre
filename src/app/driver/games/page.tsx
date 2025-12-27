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
            <main className="p-4 max-w-lg mx-auto space-y-6 pt-6">
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold mb-2">¡Tómate un respiro!</h2>
                    <p className="text-muted-foreground">Relájate unos minutos antes de volver a la ruta.</p>
                </div>

                <div className="grid grid-cols-1 gap-6">
                    {/* Snake Card */}
                    <Link
                        href="/driver/games/snake"
                        className="group relative overflow-hidden bg-card border border-green-500/30 rounded-2xl p-6 hover:scale-[1.02] transition-all duration-300 shadow-lg hover:shadow-green-500/20"
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Gamepad2 className="w-32 h-32 text-green-500" />
                        </div>
                        <div className="relative z-10 flex items-center gap-4">
                            <div className="w-16 h-16 rounded-xl bg-green-500/10 flex items-center justify-center border border-green-500/20 group-hover:bg-green-500/20 transition-colors">
                                <div className="text-3xl">🐍</div>
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-foreground mb-1">Snake</h3>
                                <p className="text-muted-foreground text-sm">El clásico inmortal. ¡Come y crece!</p>
                            </div>
                        </div>
                    </Link>

                    {/* Pacman Card */}
                    <Link
                        href="/driver/games/pacman"
                        className="group relative overflow-hidden bg-card border border-yellow-500/30 rounded-2xl p-6 hover:scale-[1.02] transition-all duration-300 shadow-lg hover:shadow-yellow-500/20"
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Ghost className="w-32 h-32 text-yellow-500" />
                        </div>
                        <div className="relative z-10 flex items-center gap-4">
                            <div className="w-16 h-16 rounded-xl bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20 group-hover:bg-yellow-500/20 transition-colors">
                                <div className="text-3xl">👻</div>
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-foreground mb-1">Pac-Man</h3>
                                <p className="text-muted-foreground text-sm">Escapa de los fantasmas y come puntos.</p>
                            </div>
                        </div>
                    </Link>

                    {/* Tetris Card */}
                    <Link
                        href="/driver/games/tetris"
                        className="group relative overflow-hidden bg-card border border-blue-500/30 rounded-2xl p-6 hover:scale-[1.02] transition-all duration-300 shadow-lg hover:shadow-blue-500/20"
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Gamepad2 className="w-32 h-32 text-blue-500" />
                        </div>
                        <div className="relative z-10 flex items-center gap-4">
                            <div className="w-16 h-16 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 group-hover:bg-blue-500/20 transition-colors">
                                <div className="text-3xl">🧱</div>
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-foreground mb-1">Tetris</h3>
                                <p className="text-muted-foreground text-sm">Encaja las piezas y limpia líneas.</p>
                            </div>
                        </div>
                    </Link>

                    {/* Arkanoid Card */}
                    <Link
                        href="/driver/games/arkanoid"
                        className="group relative overflow-hidden bg-card border border-red-500/30 rounded-2xl p-6 hover:scale-[1.02] transition-all duration-300 shadow-lg hover:shadow-red-500/20"
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Gamepad2 className="w-32 h-32 text-red-500" />
                        </div>
                        <div className="relative z-10 flex items-center gap-4">
                            <div className="w-16 h-16 rounded-xl bg-red-500/10 flex items-center justify-center border border-red-500/20 group-hover:bg-red-500/20 transition-colors">
                                <div className="text-3xl">🎾</div>
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-foreground mb-1">Arkanoid</h3>
                                <p className="text-muted-foreground text-sm">Rebota la bola y rompe los bloques.</p>
                            </div>
                        </div>
                    </Link>

                    {/* Ranking Card */}
                    <Link
                        href="/driver/ranking"
                        className="group relative overflow-hidden bg-card border border-purple-500/30 rounded-2xl p-6 hover:scale-[1.02] transition-all duration-300 shadow-lg hover:shadow-purple-500/20"
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Trophy className="w-32 h-32 text-purple-500" />
                        </div>
                        <div className="relative z-10 flex items-center gap-4">
                            <div className="w-16 h-16 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20 group-hover:bg-purple-500/20 transition-colors">
                                <div className="text-3xl">🏆</div>
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-foreground mb-1">Ranking</h3>
                                <p className="text-muted-foreground text-sm">Consulta quién es el mejor conductor del mes.</p>
                            </div>
                        </div>
                    </Link>
                </div>
            </main>
        </div>
    );
}
