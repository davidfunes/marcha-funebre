'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import {
    Droplets,
    Save,
    ArrowLeft,
    CheckCircle,
    Car,
    Camera,
    Sparkles,
    Trophy
} from 'lucide-react';
import Link from 'next/link';
import { Vehicle } from '@/types';
import { awardPointsForAction } from '@/services/GamificationService';
import { uploadFile } from '@/services/FirebaseService';

export default function LogWashPage() {
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
    const [washType, setWashType] = useState<'exterior' | 'interior' | 'complete'>('exterior');
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
            alert('Es obligatorio adjuntar una foto del lavado.');
            return;
        }

        if (!user) return;

        setLoading(true);
        try {
            // 1. Upload image if exists
            let imageUrl = '';
            if (image) {
                const path = `washes/${user.id}/wash_${Date.now()}_${image.name}`;
                imageUrl = await uploadFile(image, path);
            }

            // 2. Log Wash Entry
            await addDoc(collection(db, 'logs'), {
                userId: user!.id,
                vehicleId: targetVehicleId,
                date: serverTimestamp(),
                type: 'wash',
                washType,
                notes,
                imageUrl,
                createdAt: serverTimestamp()
            });

            // 2. Award Points Configurable
            if (user.id) {
                const pointKey = washType === 'complete' ? 'wash_complete' :
                    (washType === 'exterior' ? 'wash_exterior' : 'wash_interior');

                const points = await awardPointsForAction(user.id, pointKey as any, `vehicle_wash_${washType}`);
                setAwardedPoints(points || 0);
            }

            setSuccess(true);
            setTimeout(() => {
                router.push('/driver/dashboard');
            }, 2500);

        } catch (error) {
            console.error('Error saving wash log:', error);
            alert('Error al guardar reporte.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 overflow-hidden relative">
                {/* Celebratory Particles (Emoji Confetti) */}
                <div className="absolute inset-0 pointer-events-none">
                    {[...Array(20)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute animate-bounce"
                            style={{
                                left: `${Math.random() * 100}%`,
                                top: `-10%`,
                                animationDuration: `${2 + Math.random() * 3}s`,
                                animationDelay: `${Math.random() * 2}s`,
                                fontSize: `${20 + Math.random() * 20}px`,
                                color: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'][Math.floor(Math.random() * 4)]
                            }}
                        >
                            {['✨', '🫧', '💎', '🎉', '🌟'][Math.floor(Math.random() * 5)]}
                        </div>
                    ))}
                </div>

                <div className="w-24 h-24 bg-gradient-to-tr from-blue-600 to-cyan-400 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-blue-500/40 animate-in zoom-in duration-500">
                    <Sparkles className="w-12 h-12 text-white animate-pulse" />
                </div>

                <h1 className="text-4xl font-black mb-2 text-center text-balance bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-cyan-500">
                    ¡COCHAZO RELUCIENTE!
                </h1>
                <p className="text-muted-foreground mb-8 text-center text-lg">El vehículo ha quedado impecable. Los agentes te lo agradecen.</p>

                {awardedPoints > 0 && (
                    <div className="bg-yellow-500/10 px-8 py-4 rounded-3xl border-2 border-yellow-500/30 text-yellow-600 font-black text-3xl mb-8 animate-bounce shadow-lg flex items-center gap-3">
                        <Trophy className="w-8 h-8" />
                        +{awardedPoints} Puntos
                    </div>
                )}

                <button
                    onClick={() => router.push('/driver/dashboard')}
                    className="w-full max-w-xs bg-card border-2 border-border hover:border-primary text-foreground font-bold py-4 rounded-2xl transition-all shadow-sm"
                >
                    Volver al inicio
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pb-20">
            <div className="bg-card border-b border-border sticky top-0 z-10 px-4 py-4 flex items-center gap-4">
                <Link href="/driver/dashboard" className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors">
                    <ArrowLeft className="w-6 h-6" />
                </Link>
                <h1 className="text-xl font-bold font-display">Registrar Lavado</h1>
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

                    {/* Wash Type Selector */}
                    <div className="space-y-3">
                        <label className="text-lg font-bold flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-blue-500" />
                            Tipo de Lavado
                        </label>
                        <div className="grid grid-cols-1 gap-3">
                            {[
                                { id: 'exterior', label: 'Exterior', desc: 'Carrocería y llantas' },
                                { id: 'interior', label: 'Interior', desc: 'Aspirado y salpicadero' },
                                { id: 'complete', label: 'Completo', desc: 'Interior y Exterior' }
                            ].map((type) => (
                                <button
                                    key={type.id}
                                    type="button"
                                    onClick={() => setWashType(type.id as any)}
                                    className={`relative p-4 rounded-xl border-2 transition-all flex items-center justify-between ${washType === type.id
                                        ? 'border-blue-500 bg-blue-500/5 shadow-md scale-[1.02]'
                                        : 'border-transparent bg-card hover:bg-muted shadow-sm'
                                        }`}
                                >
                                    <div className="text-left">
                                        <p className={`font-bold ${washType === type.id ? 'text-blue-700 dark:text-blue-300' : 'text-foreground'}`}>
                                            {type.label}
                                        </p>
                                        <p className="text-xs text-muted-foreground">{type.desc}</p>
                                    </div>
                                    {washType === type.id && <CheckCircle className="w-5 h-5 text-blue-500" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Camera Upload - Required */}
                    <div>
                        <span className="text-sm font-medium text-foreground mb-2 block">Foto del Resultado (Obligatorio)</span>
                        <label className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-xl cursor-pointer hover:bg-muted/50 transition bg-card ${image ? 'border-green-500/50 bg-green-500/5' : 'border-border'}`}>
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                {image ? (
                                    <>
                                        <CheckCircle className="w-10 h-10 text-green-500 mb-2" />
                                        <p className="text-sm text-green-600 font-bold">Foto adjunta</p>
                                        <p className="text-xs text-muted-foreground mt-1">{image.name}</p>
                                    </>

                                ) : (
                                    <>
                                        <Camera className="w-10 h-10 text-muted-foreground mb-2" />
                                        <p className="text-sm text-muted-foreground">Toca para añadir foto</p>
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
                        <span className="text-sm text-foreground mb-1 block">Notas</span>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full px-4 py-3 bg-card border border-input rounded-xl focus:ring-2 focus:ring-blue-500 outline-none min-h-[60px]"
                            placeholder="Comentarios sobre el lavado..."
                        ></textarea>
                    </label>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/50 border-t-white"></div> : (
                            <>
                                <Droplets className="w-5 h-5" />
                                Registrar Lavado
                            </>
                        )}
                    </button>
                </form>
            </main>
        </div>
    );
}
