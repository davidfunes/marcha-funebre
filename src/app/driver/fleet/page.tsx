'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase/firebase';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, increment } from 'firebase/firestore';
import { Vehicle } from '@/types';
import {
    Car,
    Calendar,
    Fuel,
    Settings,
    AlertTriangle,
    FileText,
    ArrowLeft,
    LogOut,
    MapPin,
    X,
    Check
} from 'lucide-react';
import Link from 'next/link';

export default function MyVehiclePage() {
    const { user } = useAuth();
    const router = useRouter();
    const [vehicle, setVehicle] = useState<Vehicle | null>(null);
    const [loading, setLoading] = useState(true);
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [parkingLocation, setParkingLocation] = useState('');
    const [returning, setReturning] = useState(false);

    useEffect(() => {
        const fetchVehicle = async () => {
            if (!user) return;

            try {
                let vehicleData: Vehicle | null = null;

                // 1. Try from profile
                if (user.assignedVehicleId) {
                    const vehicleDoc = await getDoc(doc(db, 'vehicles', user.assignedVehicleId));
                    if (vehicleDoc.exists()) {
                        vehicleData = { id: vehicleDoc.id, ...vehicleDoc.data() } as Vehicle;
                    }
                }

                // 2. Try from collection query if profile isn't updated yet
                if (!vehicleData && user.id) {
                    const q = query(
                        collection(db, 'vehicles'),
                        where('assignedDriverId', '==', user.id)
                    );
                    const querySnapshot = await getDocs(q);
                    if (!querySnapshot.empty) {
                        const doc = querySnapshot.docs[0];
                        vehicleData = { id: doc.id, ...doc.data() } as Vehicle;
                    }
                }

                setVehicle(vehicleData);
            } catch (err) {
                console.error('Error fetching vehicle:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchVehicle();
    }, [user]);

    const handleReturnVehicle = async () => {
        if (!vehicle || !user) return;

        // Validation: If parking required, must have input
        if (vehicle.requiresParkingSpot && !parkingLocation.trim()) {
            alert('Debes indicar la ubicación del parking.');
            return;
        }

        setReturning(true);
        try {
            // 1. Update Vehicle
            await updateDoc(doc(db, 'vehicles', vehicle.id!), {
                assignedDriverId: null,
                status: 'active' as any,
                parkingLocation: vehicle.requiresParkingSpot ? parkingLocation : null
            });

            // 2. Update User
            await updateDoc(doc(db, 'users', user.id!), {
                assignedVehicleId: null
            });

            // 3. Close Modal & Redirect
            setShowReturnModal(false);
            router.push('/driver/dashboard');

        } catch (error) {
            console.error('Error returning vehicle:', error);
            alert('Error al devolver el vehículo');
        } finally {
            setReturning(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!vehicle) {
        return (
            <div className="min-h-screen bg-background p-4 flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
                    <Car className="w-10 h-10 text-muted-foreground" />
                </div>
                <h1 className="text-2xl font-bold text-foreground mb-2">Sin Vehículo Asignado</h1>
                <p className="text-muted-foreground mb-8 max-w-xs">
                    No tienes ningún vehículo asignado actualmente.
                </p>
                <div className="flex flex-col gap-3 w-full max-w-xs">
                    <Link
                        href="/driver/select-vehicle"
                        className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                    >
                        <Car className="w-5 h-5" />
                        Seleccionar Vehículo
                    </Link>
                    <Link
                        href="/driver/dashboard"
                        className="px-6 py-3 bg-muted text-foreground rounded-lg font-medium hover:bg-muted/80 transition-colors"
                    >
                        Volver al Inicio
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground pb-20 relative">
            {/* Header with Back Button */}
            <div className="bg-card border-b border-border sticky top-0 z-10 px-4 py-4 flex items-center gap-4">
                <Link href="/driver/dashboard" className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors">
                    <ArrowLeft className="w-6 h-6" />
                </Link>
                <h1 className="text-xl font-bold font-display">Mi Vehículo</h1>
            </div>

            <main className="p-4 max-w-lg mx-auto space-y-6">
                {/* Vehicle Card Main */}
                <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
                    <div className="aspect-video bg-muted relative">
                        {vehicle.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={vehicle.image}
                                alt={`${vehicle.brand} ${vehicle.model}`}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-muted/50">
                                <Car className="w-16 h-16 text-muted-foreground/30" />
                            </div>
                        )}
                        <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs font-bold border border-white/10 uppercase tracking-wider">
                            {vehicle.status}
                        </div>
                    </div>
                    <div className="p-5">
                        <h2 className="text-2xl font-bold text-foreground mb-1">{vehicle.brand} {vehicle.model}</h2>
                        <p className="text-muted-foreground font-mono text-lg tracking-wider mb-4">{vehicle.plate}</p>

                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                            <div>
                                <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Odómetro</p>
                                <div className="flex items-center gap-2">
                                    <Settings className="w-4 h-4 text-primary" />
                                    <span className="font-semibold">{vehicle.odometer.toLocaleString()} km</span>
                                </div>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Combustible</p>
                                <div className="flex items-center gap-2">
                                    <Fuel className="w-4 h-4 text-primary" />
                                    <span className="font-semibold capitalize">{vehicle.fuelType}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Info Cards */}
                <div className="grid grid-cols-1 gap-4">
                    <div className="bg-card p-4 rounded-xl border border-border flex items-center gap-4">
                        <div className="bg-blue-500/10 p-3 rounded-lg text-blue-500">
                            <Calendar className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Próximo Mantenimiento</p>
                            <p className="font-semibold">
                                {vehicle.nextMaintenanceDate
                                    ? new Date(vehicle.nextMaintenanceDate.seconds * 1000).toLocaleDateString()
                                    : 'No programado'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Return Button */}
                <button
                    onClick={() => setShowReturnModal(true)}
                    className="w-full flex items-center justify-center gap-2 py-4 bg-muted hover:bg-muted/80 text-muted-foreground font-medium rounded-xl transition-colors"
                >
                    <LogOut className="w-5 h-5" />
                    Devolver Vehículo
                </button>

                {/* Actions */}
                <div className="space-y-3">
                    <h3 className="font-bold text-foreground">Acciones Rápidas</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <Link
                            href="/driver/report-incident"
                            className="flex flex-col items-center justify-center p-4 bg-card border border-border rounded-xl hover:bg-red-500/5 hover:border-red-500/20 transition-all group"
                        >
                            <AlertTriangle className="w-8 h-8 text-red-500 mb-2 group-hover:scale-110 transition-transform" />
                            <span className="text-sm font-medium text-foreground">Reportar Incidencia</span>
                        </Link>
                        <Link
                            href="/driver/log-km-fuel"
                            className="flex flex-col items-center justify-center p-4 bg-card border border-border rounded-xl hover:bg-blue-500/5 hover:border-blue-500/20 transition-all group"
                        >
                            <Fuel className="w-8 h-8 text-blue-500 mb-2 group-hover:scale-110 transition-transform" />
                            <span className="text-sm font-medium text-foreground">Añadir Combustible</span>
                        </Link>
                    </div>
                </div>
            </main>

            {/* Return Modal */}
            {showReturnModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-card w-full max-w-md rounded-2xl p-6 shadow-xl border border-border animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-foreground">Devolver Vehículo</h3>
                            <button onClick={() => setShowReturnModal(false)} className="p-1 hover:bg-muted rounded-full transition-colors">
                                <X className="w-6 h-6 text-muted-foreground" />
                            </button>
                        </div>

                        <p className="text-muted-foreground mb-6">
                            ¿Estás seguro de que deseas dejar de usar este vehículo?
                        </p>

                        {vehicle.requiresParkingSpot && (
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    <span className="flex items-center gap-1.5">
                                        <MapPin className="w-4 h-4 text-primary" />
                                        Ubicación del Parking (Obligatorio)
                                    </span>
                                </label>
                                <input
                                    type="text"
                                    value={parkingLocation}
                                    onChange={(e) => setParkingLocation(e.target.value)}
                                    placeholder="Ej: Plaza 42, Planta -1"
                                    className="w-full px-4 py-3 bg-background border border-input rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                                />
                                <p className="text-xs text-muted-foreground mt-2">
                                    Este vehículo requiere indicar dónde queda aparcado.
                                </p>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowReturnModal(false)}
                                disabled={returning}
                                className="flex-1 py-3 bg-muted hover:bg-muted/80 text-foreground font-medium rounded-xl transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleReturnVehicle}
                                disabled={returning || (vehicle.requiresParkingSpot && !parkingLocation.trim())}
                                className="flex-1 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl shadow-lg shadow-primary/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {returning ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white"></div> : 'Confirmar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
