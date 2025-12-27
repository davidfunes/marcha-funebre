'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase/firebase';
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Vehicle } from '@/types';
import {
    Car,
    ArrowRight,
    Search,
    Filter,
    ArrowLeft
} from 'lucide-react';
import Link from 'next/link';

export default function SelectVehiclePage() {
    const { user } = useAuth();
    const router = useRouter();
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [assigning, setAssigning] = useState<string | null>(null);

    useEffect(() => {
        const fetchAvailableVehicles = async () => {
            try {
                if (user?.assignedVehicleId) {
                    router.push('/driver/fleet');
                    return;
                }

                // Get all vehicles and filter in memory to handle 'active' and legacy 'available' status
                // This also avoids issues with missing composite indexes for now
                const q = query(collection(db, 'vehicles'));
                const querySnapshot = await getDocs(q);

                const available: Vehicle[] = [];
                querySnapshot.forEach((doc) => {
                    const data = doc.data() as Vehicle;
                    // Filter:
                    // 1. Not assigned
                    // 2. Not management
                    // 3. Status is 'active'
                    const isStatusOk = data.status === 'active';

                    if (!data.assignedDriverId && !data.isManagement && isStatusOk) {
                        available.push({ id: doc.id, ...data });
                    }
                });

                setVehicles(available);
            } catch (error) {
                console.error('Error fetching vehicles:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchAvailableVehicles();
    }, []);

    const handleAssign = async (vehicleId: string) => {
        if (!user) return;
        setAssigning(vehicleId);

        try {
            // 1. Update User
            await updateDoc(doc(db, 'users', user.id!), {
                assignedVehicleId: vehicleId
            });

            // 2. Update Vehicle
            await updateDoc(doc(db, 'vehicles', vehicleId), {
                assignedDriverId: user.id!
            });

            router.push('/driver/fleet');
        } catch (error) {
            console.error('Error assigning vehicle:', error);
            alert('Error al asignar el vehículo. Inténtalo de nuevo.');
            setAssigning(null);
        }
    };

    const filteredVehicles = vehicles.filter(v =>
        v.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.plate.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground pb-20">
            {/* Header */}
            <div className="bg-card border-b border-border sticky top-0 z-10 px-4 py-4 flex items-center gap-4">
                <Link href="/driver/dashboard" className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors">
                    <ArrowLeft className="w-6 h-6" />
                </Link>
                <h1 className="text-xl font-bold font-display">Seleccionar Vehículo</h1>
            </div>

            <main className="p-4 max-w-lg mx-auto">
                <div className="mb-6 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Buscar por modelo o matrícula..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-card border border-input rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                    />
                </div>

                {filteredVehicles.length === 0 ? (
                    <div className="text-center py-10">
                        <Car className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-muted-foreground">No hay vehículos disponibles</h3>
                        <p className="text-sm text-muted-foreground/70">
                            {searchTerm ? 'Prueba con otra búsqueda' : 'Contacta con tu gestor.'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredVehicles.map((vehicle) => (
                            <div
                                key={vehicle.id}
                                className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 hover:border-primary/50 transition-colors"
                            >
                                <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                                    {vehicle.image ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={vehicle.image} alt={vehicle.model} className="w-full h-full object-cover" />
                                    ) : (
                                        <Car className="w-8 h-8 text-muted-foreground" />
                                    )}
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-foreground">{vehicle.brand} {vehicle.model}</h3>
                                    <p className="text-sm text-muted-foreground font-mono">{vehicle.plate}</p>
                                    {vehicle.requiresParkingSpot && (
                                        <span className="text-xs bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-full mt-1 inline-block border border-blue-500/20">
                                            Requiere Parking
                                        </span>
                                    )}
                                </div>
                                <button
                                    onClick={() => handleAssign(vehicle.id!)}
                                    disabled={!!assigning}
                                    className="p-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                                >
                                    {assigning === vehicle.id ? (
                                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white"></div>
                                    ) : (
                                        <ArrowRight className="w-5 h-5" />
                                    )}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
