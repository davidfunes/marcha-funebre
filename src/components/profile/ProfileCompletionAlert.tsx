'use client';

import { AlertTriangle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface ProfileCompletionAlertProps {
    role: 'admin' | 'conductor' | 'manager';
}

export const ProfileCompletionAlert = ({ role }: ProfileCompletionAlertProps) => {
    const profilePath = role === 'admin' ? '/admin/profile' : '/driver/profile';

    return (
        <div className="bg-destructive/10 border-l-4 border-destructive p-4 mb-4 mx-4 md:mx-0 rounded-r-md mt-4">
            <div className="flex items-start md:items-center justify-between flex-col md:flex-row gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-destructive/20 rounded-full shrink-0">
                        <AlertTriangle className="w-5 h-5 text-destructive" />
                    </div>
                    <div>
                        <h4 className="font-semibold text-destructive-foreground">Perfil Incompleto</h4>
                        <p className="text-sm text-muted-foreground">
                            Es necesario que completes tu información personal (Apellidos) para continuar usando la aplicación correctamente.
                        </p>
                    </div>
                </div>
                <Link
                    href={profilePath}
                    className="flex items-center gap-2 px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition-colors text-sm font-medium whitespace-nowrap"
                >
                    Completar Perfil
                    <ArrowRight className="w-4 h-4" />
                </Link>
            </div>
        </div>
    );
};
