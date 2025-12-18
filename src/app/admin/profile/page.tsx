'use client';

import { useAuth } from '@/contexts/AuthContext';
import { ProfileForm } from '@/components/profile/ProfileForm';

export default function AdminProfilePage() {
    const { user } = useAuth();

    const handleUpdate = () => {
        // Optional: Show success toast
    };

    if (!user) return null;

    return (
        <div className="p-6 md:p-8 space-y-6 max-w-5xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Mi Perfil</h1>
                <p className="text-muted-foreground mt-2">
                    Gestiona tu información personal y completa tu perfil.
                </p>
            </div>

            <ProfileForm user={user} onUpdate={handleUpdate} />
        </div>
    );
}
