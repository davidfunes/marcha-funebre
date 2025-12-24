'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import {
    CircleDot,
    Save,
    ArrowLeft,
    CheckCircle,
    Car,
    Camera,
    Droplets
} from 'lucide-react';
import Link from 'next/link';
import { Vehicle } from '@/types';
import { awardPointsForAction } from '@/services/GamificationService';
import { uploadFile } from '@/services/FirebaseService';

export default function LogTiresPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [awardedPoints, setAwardedPoints] = useState(0);

    // Vehicle Selection
    const [availableVehicles, setAvailableVehicles] = useState<Vehicle[]>([]);
    const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
    const [isLoadingVehicles, setIsLoadingVehicles] = useState(false);

    // Form States
    const [image, setImage] = useState<File | null>(null);
    const [notes, setNotes] = useState('');

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
        if (!image) {
            alert('Es obligatorio adjuntar una foto del control de presión.');
            return;
        }

        if (!user) return;

        setLoading(true);
        try {
            // 1. Upload image
            const path = `tires/${user.id}/tire_${Date.now()}_${image.name}`;
            const imageUrl = await uploadFile(image, path);

            // 2. Log Entry
            await addDoc(collection(db, 'logs'), {
                userId: user.id,
                vehicleId: targetVehicleId,
                date: serverTimestamp(),
                type: 'tire_pressure',
                notes,
                imageUrl,
                createdAt: serverTimestamp()
            });

            // 3. Award Points (50 pts)
            const points = await awardPointsForAction(user.id!, 'tire_pressure_log');
            setAwardedPoints(points || 0);

            setSuccess(true);
        } catch (error) {
            console.error('Error saving tire log:', error);
            alert('Error al guardar el reporte.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 animate-in fade-in zoom-in duration-300">
                <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/20">
                    <CheckCircle className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-3xl font-bold mb-2 text-center text-balance">¡Presión Registrada!</h1>
                <p className="text-muted-foreground mb-6 text-center">La seguridad es lo primero. ¡Buen trabajo!</p>

                {awardedPoints > 0 && (
                    <div className="bg-yellow-500/10 px-6 py-3 rounded-full border border-yellow-500/20 text-yellow-600 font-bold text-lg mb-8 animate-bounce">
                        +{awardedPoints} Puntos
                    </div>
                )}

                <div className="flex flex-col gap-3 w-full max-w-xs">
                    <Link
                        href="/driver/log-wash"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                        <Droplets className="w-5 h-5" />
                        ¡Ahora a por el lavado!
                    </Link>
                    <Link
                        href="/driver/dashboard"
                        className="w-full bg-muted hover:bg-muted/80 text-foreground font-bold py-4 rounded-xl transition-all text-center"
                    >
                        Volver al inicio
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pb-20">
            <div className="bg-card border-b border-border sticky top-0 z-10 px-4 py-4 flex items-center gap-4 shadow-sm">
                <Link href="/driver/dashboard" className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors">
                    <ArrowLeft className="w-6 h-6" />
                </Link>
                <h1 className="text-xl font-bold font-display">Control de Neumáticos</h1>
            </div>

            <main className="p-4 max-w-lg mx-auto">
                <form onSubmit={handleSubmit} className="space-y-8">
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

                    <div className="bg-blue-500/5 border border-blue-500/10 p-4 rounded-xl flex gap-4">
                        <div className="p-2 bg-blue-500/10 rounded-lg h-fit text-blue-500">
                            <CircleDot className="w-5 h-5" />
                        </div>
                        <p className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed">
                            Coger el hábito de revisar los neumáticos reduce el consumo y mejora la seguridad. <strong>¡Gana 50 puntos por cada revisión!</strong>
                        </p>
                    </div>

                    <div>
                        <span className="text-sm font-medium text-foreground mb-2 block font-display uppercase tracking-wider">Foto de la revisión (Obligatorio)</span>
                        <label className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-2xl cursor-pointer hover:bg-muted/50 transition bg-card shadow-inner ${image ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-border'}`}>
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                {image ? (
                                    <>
                                        <CheckCircle className="w-12 h-12 text-emerald-500 mb-2" />
                                        <p className="text-sm text-emerald-600 font-bold">Foto capturada</p>
                                        <p className="text-xs text-muted-foreground mt-1">{image.name}</p>
                                    </>
                                ) : (
                                    <>
                                        <Camera className="w-12 h-12 text-muted-foreground mb-2" />
                                        <p className="text-base font-bold text-muted-foreground">Tocar para hacer foto</p>
                                        <p className="text-xs text-muted-foreground/60 mt-1">Evidencia de la presión correcta</p>
                                    </>
                                )}
                            </div>
                            <input
                                type="file"
                                className="hidden"
                                accept="image/*"
                                onChange={(e) => setImage(e.target.files?.[0] || null)}
                            />
                        </label>
                    </div>

                    <label className="block">
                        <span className="text-sm text-foreground mb-1 block font-display uppercase tracking-wider">Notas adicionales</span>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full px-4 py-3 bg-card border border-input rounded-xl focus:ring-2 focus:ring-blue-500 outline-none min-h-[80px] shadow-inner font-sans"
                            placeholder="Comentarios sobre el estado de las ruedas..."
                        ></textarea>
                    </label>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-5 rounded-xl shadow-xl shadow-emerald-500/20 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 text-lg"
                    >
                        {loading ? <div className="animate-spin rounded-full h-6 w-6 border-2 border-white/50 border-t-white"></div> : (
                            <>
                                <Save className="w-5 h-5" />
                                Registrar Revisión
                            </>
                        )}
                    </button>
                </form>
            </main>
        </div>
    );
}
