'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase/firebase';
import { collection, addDoc, doc, updateDoc, increment, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import {
    Fuel,
    Settings,
    Camera,
    Save,
    ArrowLeft,
    CheckCircle,
    Car
} from 'lucide-react';
import Link from 'next/link';
import { Vehicle } from '@/types';

type LogType = 'km' | 'fuel';

export default function LogKmFuelPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<LogType>('km');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    // Vehicle Selection State (if not assigned)
    const [availableVehicles, setAvailableVehicles] = useState<Vehicle[]>([]);
    const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
    const [isLoadingVehicles, setIsLoadingVehicles] = useState(false);

    // Form States
    const [odometer, setOdometer] = useState('');
    const [liters, setLiters] = useState('');
    const [cost, setCost] = useState('');
    const [notes, setNotes] = useState('');
    const [image, setImage] = useState<File | null>(null);

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
                        // Filters: Not assigned, Not Management
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
                // If user has a vehicle, pre-select it implicitly (logic handled in submit)
                setSelectedVehicleId(user.assignedVehicleId);
            }
        };

        fetchVehicles();
    }, [user]);


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const targetVehicleId = user?.assignedVehicleId || selectedVehicleId;

        if (!targetVehicleId) {
            alert('Debes tener un vehículo asignado o seleccionar uno.');
            return;
        }

        setLoading(true);

        try {
            // 1. Create Log Entry
            const logData = {
                userId: user!.id,
                vehicleId: targetVehicleId,
                date: serverTimestamp(),
                type: activeTab,
                value: activeTab === 'km' ? Number(odometer) : Number(liters),
                cost: activeTab === 'fuel' ? Number(cost) : null,
                notes,
                // Image upload would happen here, getting URL. Simulating for now.
                imageUrl: image ? 'https://simulate-url.com/receipt.jpg' : null,
                createdAt: serverTimestamp()
            };

            await addDoc(collection(db, 'logs'), logData);

            // 2. Update Vehicle Odometer if KM log
            if (activeTab === 'km') {
                await updateDoc(doc(db, 'vehicles', targetVehicleId), {
                    odometer: Number(odometer),
                    updatedAt: serverTimestamp()
                });
            }

            // 3. Gamification: Award 10 Points
            if (user!.id) {
                await updateDoc(doc(db, 'users', user!.id), {
                    points: increment(10)
                });
            }

            setSuccess(true);
            setTimeout(() => {
                router.push('/driver/dashboard');
            }, 2000);

        } catch (error) {
            console.error('Error saving log:', error);
            alert('Error al guardar el registro');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center animate-in fade-in zoom-in duration-300">
                <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-green-500/20">
                    <CheckCircle className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-foreground mb-2">¡Registro Guardado!</h1>
                <p className="text-muted-foreground mb-6">Información actualizada correctamente.</p>
                <div className="bg-yellow-500/10 px-6 py-3 rounded-full border border-yellow-500/20 text-yellow-600 font-bold text-lg animate-bounce">
                    +10 Puntos
                </div>
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
                <h1 className="text-xl font-bold font-display">Registrar Actividad</h1>
            </div>

            <main className="p-4 max-w-lg mx-auto">
                {/* Tabs */}
                <div className="grid grid-cols-2 gap-2 mb-8 bg-muted p-1 rounded-xl">
                    <button
                        onClick={() => setActiveTab('km')}
                        className={`flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'km'
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        <Settings className="w-4 h-4" />
                        Kilometraje
                    </button>
                    <button
                        onClick={() => setActiveTab('fuel')}
                        className={`flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'fuel'
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        <Fuel className="w-4 h-4" />
                        Combustible
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Vehicle Selection Loop */}
                    {!user?.assignedVehicleId && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-4 duration-300">
                            <label className="text-sm font-medium text-foreground">Seleccionar Vehículo</label>
                            {isLoadingVehicles ? (
                                <div className="h-12 w-full bg-muted animate-pulse rounded-xl"></div>
                            ) : (
                                <div className="relative">
                                    <Car className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                                    <select
                                        value={selectedVehicleId}
                                        onChange={(e) => setSelectedVehicleId(e.target.value)}
                                        required
                                        className="w-full pl-12 pr-4 py-3 bg-card border border-input rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition appearance-none"
                                    >
                                        <option value="">-- Elige un vehículo --</option>
                                        {availableVehicles.map(v => (
                                            <option key={v.id} value={v.id}>
                                                {v.brand} {v.model} - {v.plate}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <p className="text-xs text-muted-foreground">
                                No tienes vehículo asignado. Selecciona el que estás usando hoy.
                            </p>
                        </div>
                    )}

                    {activeTab === 'km' ? (
                        <div className="space-y-4">
                            <label className="block">
                                <span className="text-sm font-medium text-foreground">Nuevo Kilometraje</span>
                                <div className="mt-1 relative">
                                    <input
                                        type="number"
                                        required
                                        value={odometer}
                                        onChange={(e) => setOdometer(e.target.value)}
                                        className="w-full px-4 py-3 bg-card border border-input rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition text-lg"
                                        placeholder="000000"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">KM</span>
                                </div>
                            </label>

                            <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-4 text-sm text-blue-600">
                                <p>Por favor, asegúrate de introducir el valor exacto que marca el tablero.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <label className="block">
                                    <span className="text-sm font-medium text-foreground">Litros</span>
                                    <div className="mt-1 relative">
                                        <input
                                            type="number"
                                            required
                                            step="0.01"
                                            value={liters}
                                            onChange={(e) => setLiters(e.target.value)}
                                            className="w-full px-4 py-3 bg-card border border-input rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                                            placeholder="0.00"
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">L</span>
                                    </div>
                                </label>
                                <label className="block">
                                    <span className="text-sm font-medium text-foreground">Coste Total</span>
                                    <div className="mt-1 relative">
                                        <input
                                            type="number"
                                            required
                                            step="0.01"
                                            value={cost}
                                            onChange={(e) => setCost(e.target.value)}
                                            className="w-full px-4 py-3 bg-card border border-input rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                                            placeholder="0.00"
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">€</span>
                                    </div>
                                </label>
                            </div>
                        </div>
                    )}

                    {/* Camera Upload (Simulation) */}
                    <div>
                        <span className="text-sm font-medium text-foreground mb-2 block">
                            {activeTab === 'km' ? 'Foto del Tablero' : 'Foto del Recibo'}
                        </span>
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-xl cursor-pointer hover:bg-muted/50 transition bg-card">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <Camera className="w-8 h-8 text-muted-foreground mb-2" />
                                <p className="text-sm text-muted-foreground">Toca para tomar foto</p>
                            </div>
                            <input
                                type="file"
                                className="hidden"
                                accept="image/*"
                                onChange={(e) => setImage(e.target.files?.[0] || null)}
                            />
                        </label>
                        {image && (
                            <p className="text-xs text-green-500 mt-2 font-medium flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" /> Imagen seleccionada: {image.name}
                            </p>
                        )}
                    </div>

                    <label className="block">
                        <span className="text-sm font-medium text-foreground">Notas (Opcional)</span>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full mt-1 px-4 py-3 bg-card border border-input rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition min-h-[80px]"
                            placeholder="Algún comentario adicional..."
                        ></textarea>
                    </label>

                    <button
                        type="submit"
                        disabled={loading || (!user?.assignedVehicleId && !selectedVehicleId)}
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                        ) : (
                            <>
                                <Save className="w-5 h-5" />
                                Guardar Registro
                            </>
                        )}
                    </button>
                </form>
            </main>
        </div>
    );
}
