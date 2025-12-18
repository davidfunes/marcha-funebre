'use client';

import { useAuth } from '@/contexts/AuthContext';
import { LogOut, Clock, ShieldAlert } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function PendingPage() {
    const { user, loading, signOut } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
            <div className="w-full max-w-md space-y-8 text-center">
                <div className="flex justify-center">
                    <Logo size="lg" />
                </div>

                <div className="rounded-xl border border-border bg-card p-8 shadow-lg animate-in fade-in zoom-in duration-300">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 mb-6">
                        <Clock className="h-8 w-8 text-amber-600" />
                    </div>

                    <h2 className="text-2xl font-bold tracking-tight text-foreground mb-2">
                        Registro Pendiente de Aprobación
                    </h2>

                    <p className="text-muted-foreground mb-6">
                        Hola <span className="font-medium text-foreground">{user?.name}</span>, tu cuenta ha sido creada correctamente pero requiere validación por parte de un administrador.
                    </p>

                    <div className="bg-muted/50 rounded-lg p-4 mb-6 text-sm text-left flex gap-3">
                        <ShieldAlert className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <p className="text-muted-foreground">
                            Por motivos de seguridad, el acceso a la plataforma está restringido hasta que tu identidad sea verificada. Recibirás una notificación cuando tu cuenta sea activada.
                        </p>
                    </div>

                    <button
                        onClick={() => signOut()}
                        className="w-full flex items-center justify-center gap-2 rounded-md bg-destructive text-destructive-foreground px-4 py-2 text-sm font-medium hover:bg-destructive/90 transition-colors"
                    >
                        <LogOut className="h-4 w-4" />
                        Volver al login
                    </button>
                </div>

                <p className="text-xs text-muted-foreground">
                    Si crees que esto es un error, contacta con soporte.
                </p>
            </div>
        </div>
    );
}
