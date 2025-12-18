'use client';

import { useAuth } from '@/contexts/AuthContext';
import { ProfileForm } from '@/components/profile/ProfileForm';

export default function DriverProfilePage() {
    const { user } = useAuth();

    // We don't really need a refetch function here because the AuthContext realtime listener 
    // will auto-update the `user` object when Firestore changes.
    // However, if we wanted to force it or show a toast, we can do it in the form.
    const handleUpdate = () => {
        // Optional: Show success toast
    };

    if (!user) return null;

    return (
        <div className="container max-w-4xl py-6 space-y-6">
            <div className="mb-8">
                <h1 className="text-2xl font-bold tracking-tight">Mi Perfil</h1>
                <p className="text-muted-foreground">
                    Gestiona tu información personal y completa tu perfil.
                </p>
            </div>

            <ProfileForm user={user} onUpdate={handleUpdate} />
        </div>
    );
}
