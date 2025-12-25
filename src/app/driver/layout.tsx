'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { LogOut, ArrowLeft, Trophy, User as UserIcon, Loader2, LayoutDashboard } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Logo } from '@/components/ui/Logo';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { isProfileComplete } from '@/utils/profileUtils';
import { isChristmasTime } from '@/utils/dateUtils';
import { ProfileCompletionAlert } from '@/components/profile/ProfileCompletionAlert';
import { Snowfall } from '@/components/ui/Snowfall';

// Map paths to titles
const PAGE_TITLES: Record<string, string> = {
    '/driver/dashboard': 'Dashboard',
    '/driver/log-km': 'Registrar Kilometraje',
    '/driver/log-fuel': 'Reportar Combustible',
    '/driver/games': 'Zona de Descanso',
    '/driver/report-incident': 'Reportar Incidencia',
    '/driver/checklist': 'Checklist Pre-Viaje',
    '/driver/directory': 'Directorio',
    '/driver/fleet': 'Mi Vehículo',
    '/driver/select-vehicle': 'Seleccionar Vehículo',
    '/driver/profile': 'Mi Perfil'
};

export default function DriverLayout({ children }: { children: React.ReactNode }) {
    const { user, loading, signOut } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.push('/login');
            } else if (user.status === 'pending') {
                router.push('/pending');
            } else if (user.role === 'admin' || user.role === 'manager') {
                setIsChecking(false);
            } else if (user.status === 'active' || user.status === 'inactive') {
                setIsChecking(false);
            } else {
                signOut().then(() => {
                    router.push('/login');
                });
            }
        }
    }, [user, loading, router, signOut]);

    if (loading || isChecking) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground animate-pulse">Verificando acceso...</p>
                </div>
            </div>
        );
    }

    const isDashboard = pathname === '/driver/dashboard';
    const currentTitle = PAGE_TITLES[pathname] || 'Marcha Fúnebre';

    return (
        <div className={`min-h-screen bg-background ${isChristmasTime() ? 'christmas-theme' : ''}`}>
            {/* Global Sticky Header */}
            <header className={`sticky top-0 z-50 w-full border-b  supports-[backdrop-filter]:bg-card/60 ${isChristmasTime() ? 'christmas-border border-b-0 bg-card/90' : 'border-border bg-card/80'}`}>
                <div className="container flex h-14 max-w-screen-2xl items-center px-4 justify-between">
                    <div className="flex items-center gap-4">
                        {isDashboard ? (
                            <Logo size="sm" />
                        ) : (
                            <Link href="/driver/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                                <ArrowLeft className="h-5 w-5" />
                                <span className="sr-only">Volver</span>
                            </Link>
                        )}
                        {!isDashboard && (
                            <h1 className="text-sm font-bold md:text-base line-clamp-1">
                                {currentTitle}
                            </h1>
                        )}
                    </div>

                    <div className="flex items-center gap-2 md:gap-4">
                        {/* Back to Admin Portal (Issue #18 Minimalist update) */}
                        {(user?.role === 'admin' || user?.role === 'manager') && (
                            <Link
                                href="/admin/dashboard"
                                className="flex items-center justify-center w-8 h-8 bg-primary/10 border border-primary/20 text-primary rounded-full hover:bg-primary/20 transition-all shadow-sm"
                                title="Volver al Portal Admin"
                            >
                                <LayoutDashboard className="w-4 h-4" />
                                <span className="sr-only">Portal Admin</span>
                            </Link>
                        )}

                        <ThemeToggle />

                        <Link href="/driver/profile" className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-muted/50" title="Mi Perfil">
                            {user?.avatar ? (
                                <img src={user.avatar} alt="Profile" className="w-6 h-6 rounded-full object-cover" />
                            ) : (
                                <UserIcon className="w-5 h-5" />
                            )}
                        </Link>

                        <div className="w-px h-6 bg-border mx-1 hidden sm:block"></div>

                        <button
                            onClick={() => signOut()}
                            className="p-2 text-muted-foreground hover:text-destructive transition-colors rounded-full hover:bg-destructive/10"
                            title="Cerrar Sesión"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Page Content */}
            <main className="relative">
                <Snowfall />
                {user && !isProfileComplete(user) && (
                    <div className="max-w-screen-2xl mx-auto">
                        <ProfileCompletionAlert role="conductor" />
                    </div>
                )}
                {children}
            </main>
        </div>
    );
}
