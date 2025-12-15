'use client';

import { useState, useEffect } from 'react';
import { getVehicles, getUsers, updateItem } from '@/services/FirebaseService';
import { Vehicle, User } from '@/types';
import { Wrench } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export function DataIntegrityChecker() {
    const { user } = useAuth();
    const [invalidVehicles, setInvalidVehicles] = useState<Vehicle[]>([]);
    const [invalidUsers, setInvalidUsers] = useState<User[]>([]);
    const [isFixing, setIsFixing] = useState(false);
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        if (!user || user.role !== 'admin') return;

        const checkIntegrity = async () => {
            try {
                const [vehicles, users] = await Promise.all([getVehicles(), getUsers()]);

                // Check for vehicles with 'available' status
                const invalidVeh = vehicles.filter(v => (v.status as any) === 'available');
                setInvalidVehicles(invalidVeh);

                // Check for users with invalid status (anything other than 'active' or 'inactive')
                const invalidUsrs = users.filter(u => u.status !== 'active' && u.status !== 'inactive');
                setInvalidUsers(invalidUsrs);
            } catch (error) {
                console.error('Error checking data integrity:', error);
            }
        };

        checkIntegrity();
    }, [user, isFixing]);

    const handleFix = async () => {
        setIsFixing(true);
        try {
            const promises = [];

            if (invalidVehicles.length > 0) {
                promises.push(...invalidVehicles.map(v =>
                    v.id ? updateItem('vehicles', v.id, { status: 'active' }) : Promise.resolve()
                ));
            }

            if (invalidUsers.length > 0) {
                promises.push(...invalidUsers.map(u =>
                    u.id ? updateItem('users', u.id, { status: 'active' }) : Promise.resolve()
                ));
            }

            await Promise.all(promises);
            alert('Datos corregidos. Recarga la página para ver los cambios.');
            setInvalidVehicles([]);
            setInvalidUsers([]);
        } catch (error) {
            console.error('Error fixing data:', error);
            alert('Error al corregir los datos.');
        } finally {
            setIsFixing(false);
        }
    };

    if ((invalidVehicles.length === 0 && invalidUsers.length === 0) || !isVisible) return null;

    return (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 animate-in slide-in-from-top">
            <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 rounded-full text-amber-600">
                        <Wrench className="h-4 w-4" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-amber-900">
                            Detectadas inconsistencias:
                            {invalidVehicles.length > 0 && ` ${invalidVehicles.length} vehículos`}
                            {invalidVehicles.length > 0 && invalidUsers.length > 0 && ' y'}
                            {invalidUsers.length > 0 && ` ${invalidUsers.length} usuarios`}.
                        </p>
                        <p className="text-xs text-amber-700">
                            Se corregirán a "active".
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleFix}
                        disabled={isFixing}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium rounded transition-colors disabled:opacity-50"
                    >
                        {isFixing ? 'Corrigiendo...' : 'Corregir Todo'}
                    </button>
                    <button
                        onClick={() => setIsVisible(false)}
                        className="text-amber-600 hover:text-amber-800 text-xs underline"
                    >
                        Ocultar
                    </button>
                </div>
            </div>
        </div>
    );
}
