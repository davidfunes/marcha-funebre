'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import {
    Fuel,
    Save,
    ArrowLeft,
    CheckCircle,
    Car,
    Droplets
} from 'lucide-react';
import Link from 'next/link';
import { Vehicle } from '@/types';
import { awardPointsForAction } from '@/services/GamificationService';

export default function LogFuelPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    // Vehicle Selection
    const [availableVehicles, setAvailableVehicles] = useState<Vehicle[]>([]);
    const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
    const [isLoadingVehicles, setIsLoadingVehicles] = useState(false);

    // Form States
    const [fuelLevel, setFuelLevel] = useState<string>('');
    const [liters, setLiters] = useState('');

    const [notes, setNotes] = useState('');

    const FUEL_LEVELS = [
        { label: 'Lleno (100%)', value: '100', color: 'bg-green-500' },
        { label: '3/4', value: '75', color: 'bg-green-400' },
        { label: 'Medio (50%)', value: '50', color: 'bg-yellow-400' },
        { label: '1/4', value: '25', color: 'bg-orange-400' },
        { label: 'Casi Reserva', value: '10', color: 'bg-red-400' },
        { label: 'Reserva (!)', value: '0', color: 'bg-red-600 animate-pulse' },
    ];

    useEffect(() => {
        const fetchVehicles = async () => {
            if (user && !user.assignedVehicleId) {
                setIsLoadingVehicles(true);
                try {
                    const q = query(
                        collection(db, 'vehicles'),
                        where('status', '==', 'active')
                    );
                    const snapshot = await getDocs(q);
                    const vehicles: Vehicle[] = [];
                    snapshot.forEach((doc) => {
                        const data = doc.data() as Vehicle;
                        if (!data.assignedDriverId && !data.isManagement) {
                            vehicles.push({ id: doc.id, ...data });
                        }
                    });
                    setAvailableVehicles(vehicles);
                } catch (error) {
                    console.error("Error fetching vehicles:", error);
                } finally {
                    setIsLoadingVehicles(false);
                }
            } else if (user?.assignedVehicleId) {
                setSelectedVehicleId(user.assignedVehicleId);
            }
        };
        fetchVehicles();
    }, [user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const targetVehicleId = user?.assignedVehicleId || selectedVehicleId;

        if (!targetVehicleId) {
            alert('Selecciona un vehículo.');
            return;
        }
        if (!fuelLevel) {
            alert('Por favor selecciona el nivel de combustible.');
            return;
        }

        setLoading(true);
        try {
            await addDoc(collection(db, 'logs'), {
                userId: user!.id,
                vehicleId: targetVehicleId,
                date: serverTimestamp(),
                type: 'fuel',
                value: 0, // Placeholder for aggregation if needed, or storing liters if provided
                fuelLevel: fuelLevel, // New specific field for level
                liters: liters ? Number(liters) : null,
                notes,
                createdAt: serverTimestamp()
            });

            if (user!.id) {
                // Dynamic points
                await awardPointsForAction(user!.id, 'log_fuel');
            }

            setSuccess(true);
            setTimeout(() => {
                router.push('/driver/dashboard');
            }, 2000);

        } catch (error) {
            console.error('Error saving log:', error);
            alert('Error al guardar reporte.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 animate-in fade-in zoom-in duration-300">
                <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-green-500/20">
                    <CheckCircle className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-3xl font-bold mb-2">¡Nivel Registrado!</h1>
                <div className="bg-yellow-500/10 px-6 py-3 rounded-full border border-yellow-500/20 text-yellow-600 font-bold text-lg animate-bounce mt-4">
                    Puntos añadidos
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pb-20">
            <div className="bg-card border-b border-border sticky top-0 z-10 px-4 py-4 flex items-center gap-4">
                <Link href="/driver/dashboard" className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors">
                    <ArrowLeft className="w-6 h-6" />
                </Link>
                <h1 className="text-xl font-bold font-display">Reportar Combustible</h1>
            </div>

            <main className="p-4 max-w-lg mx-auto">
                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Vehicle Selection Logic */}
                    {!user?.assignedVehicleId && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Vehículo</label>
                            {isLoadingVehicles ? (
                                <div className="h-12 w-full bg-muted animate-pulse rounded-xl"></div>
                            ) : (
                                <div className="relative">
                                    <Car className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                                    <select
                                        value={selectedVehicleId}
                                        onChange={(e) => setSelectedVehicleId(e.target.value)}
                                        required
                                        className="w-full pl-12 pr-4 py-3 bg-card border border-input rounded-xl outline-none"
                                    >
                                        <option value="">-- Seleccionar --</option>
                                        {availableVehicles.map(v => (
                                            <option key={v.id} value={v.id}>{v.brand} {v.model} - {v.plate}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Fuel Level Selector */}
                    <div className="space-y-3">
                        <label className="text-lg font-bold flex items-center gap-2">
                            <Fuel className="w-5 h-5 text-primary" />
                            Nivel Actual
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            {FUEL_LEVELS.map((level) => (
                                <button
                                    key={level.value}
                                    type="button"
                                    onClick={() => setFuelLevel(level.value)}
                                    className={`relative p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${fuelLevel === level.value
                                        ? 'border-primary bg-primary/5 shadow-md scale-[1.02]'
                                        : 'border-transparent bg-card hover:bg-muted shadow-sm'
                                        }`}
                                >
                                    <div className={`w-full h-3 rounded-full ${level.color} opacity-80`}></div>
                                    <span className={`text-sm font-bold ${fuelLevel === level.value ? 'text-foreground' : 'text-muted-foreground'}`}>
                                        {level.label}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Optional Fields (Collapsible or just visible) */}
                    <div className="pt-4 border-t border-border">
                        <p className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">Opcional (Si has repostado)</p>
                        <div className="grid grid-cols-1 gap-4">
                            <label className="block">
                                <span className="text-sm text-foreground mb-1 block">Litros</span>
                                <div className="relative">
                                    <Droplets className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={liters}
                                        onChange={(e) => setLiters(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-card border border-input rounded-xl focus:ring-2 focus:ring-primary outline-none transition"
                                        placeholder="0.00"
                                    />
                                </div>
                            </label>
                        </div>
                    </div>

                    <label className="block">
                        <span className="text-sm text-foreground mb-1 block">Notas</span>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full px-4 py-3 bg-card border border-input rounded-xl focus:ring-2 focus:ring-primary outline-none min-h-[60px]"
                            placeholder="Notas adicionales..."
                        ></textarea>
                    </label>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/50 border-t-white"></div> : 'Guardar Reporte'}
                    </button>
                </form>
            </main>
        </div>
    );
}
