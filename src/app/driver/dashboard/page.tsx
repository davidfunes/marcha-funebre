'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase/firebase';
import { doc, getDoc, writeBatch, increment } from 'firebase/firestore';
import {
    Camera,
    AlertTriangle,
    Car,
    CheckSquare,
    User,
    LogOut,
    Gauge,
    Fuel,
    Users,
    Gamepad2,
    Lock,
    ArrowRight,
    MapPin,
    X,
    Droplets,
    Info,
    Trophy,
    CircleDot,
    Shield,
    Zap,
    Award,
    Star,
    Crown,
    Medal,
    BookOpen
} from 'lucide-react';
import Link from 'next/link';
import { Vehicle } from '@/types';
import { getFuelLevelMessage } from '@/utils/fuelUtils';
import { getUserRank, getNextRankProgress } from '@/services/GamificationService';

export default function DriverDashboard() {
    const { user, loading, signOut } = useAuth();
    const router = useRouter();
    const [assignedVehicle, setAssignedVehicle] = useState<Vehicle | null>(null);
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [parkingLocation, setParkingLocation] = useState('');
    const [returning, setReturning] = useState(false);

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.push('/login');
            } else if (user.role !== 'conductor' && user.role !== 'admin' && user.role !== 'manager') {
                router.push('/admin/dashboard');
            }
        }
    }, [user, loading, router]);

    // Fetch assigned vehicle details
    useEffect(() => {
        const fetchVehicle = async () => {
            if (user?.assignedVehicleId) {
                try {
                    const vehicleDoc = await getDoc(doc(db, 'vehicles', user.assignedVehicleId));
                    if (vehicleDoc.exists()) {
                        setAssignedVehicle({ id: vehicleDoc.id, ...vehicleDoc.data() } as Vehicle);
                    }
                } catch (error) {
                    console.error("Error fetching vehicle:", error);
                }
            } else {
                setAssignedVehicle(null);
            }
        };
        fetchVehicle();
    }, [user?.assignedVehicleId]);

    const handleReturnVehicle = async () => {
        if (!assignedVehicle || !user) return;

        // Validation
        if (assignedVehicle.requiresParkingSpot && !parkingLocation.trim()) {
            alert('Debes indicar la ubicación del parking.');
            return;
        }

        setReturning(true);
        try {
            const batch = writeBatch(db);

            // 1. Update Vehicle Reference
            const vehicleRef = doc(db, 'vehicles', assignedVehicle.id!);
            batch.update(vehicleRef, {
                assignedDriverId: null,
                status: 'active' as any,
                parkingLocation: assignedVehicle.requiresParkingSpot ? parkingLocation : null
            });

            // 2. Update User Reference
            const userRef = doc(db, 'users', user.id!);
            batch.update(userRef, {
                assignedVehicleId: null
            });

            // Commit atomic batch
            await batch.commit();

            // 3. Reset Local State
            setAssignedVehicle(null);
            setShowReturnModal(false);
            setParkingLocation('');

        } catch (error: any) {
            console.error('Error returning vehicle (Technical Details):', error);
            const errorMsg = error.message || String(error);
            const errorCode = error.code || 'unknown';
            alert(`Error al devolver el vehículo.\n\nDetalles: ${errorMsg}\nCódigo: ${errorCode}`);
        } finally {
            setReturning(false);
        }
    };

    if (loading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
            </div>
        );
    }

    const quickActions = [
        {
            label: user?.assignedVehicleId
                ? (assignedVehicle ? `Mi Vehículo: ${assignedVehicle.brand} ${assignedVehicle.model}` : 'Mi Vehículo')
                : 'Seleccionar Vehículo',
            description: user?.assignedVehicleId
                ? (assignedVehicle ? `${assignedVehicle.plate} • Estado e inventario` : 'Cargando datos...')
                : 'Asignarme un coche disponible',
            href: user?.assignedVehicleId ? '/driver/fleet' : '/driver/select-vehicle',
            icon: Car,
            color: 'text-emerald-400',
            bg: 'bg-emerald-500/10',
            border: 'border-emerald-500/20',
            isVehicleCard: true,
            requiresVehicle: false
        },
        {
            label: 'Checklist Pre-Viaje',
            description: 'Gana puntos extra',
            href: '/driver/checklist',
            icon: CheckSquare,
            color: 'text-purple-400',
            bg: 'bg-purple-500/10',
            border: 'border-purple-500/20',
            requiresVehicle: true
        },
        {
            label: 'Registrar Kilometraje',
            description: 'Foto del salpicadero',
            href: '/driver/log-km',
            icon: Gauge,
            color: 'text-blue-400',
            bg: 'bg-blue-500/10',
            border: 'border-blue-500/20',
            requiresVehicle: true
        },
        {
            label: 'Reportar Incidencia',
            description: 'Informe de daños/averías',
            href: '/driver/report-incident',
            icon: AlertTriangle,
            color: 'text-amber-400',
            bg: 'bg-amber-500/10',
            border: 'border-amber-500/20',
            requiresVehicle: true
        },
        {
            label: 'Reportar Combustible',
            description: 'Nivel actual',
            href: '/driver/log-fuel',
            icon: Fuel,
            color: 'text-orange-400',
            bg: 'bg-orange-500/10',
            border: 'border-orange-500/20',
            requiresVehicle: true
        },
        {
            label: 'Presión de Neumáticos',
            description: 'Control de seguridad',
            href: '/driver/log-tires',
            icon: CircleDot,
            color: 'text-emerald-400',
            bg: 'bg-emerald-500/10',
            border: 'border-emerald-500/20',
            requiresVehicle: true
        },
        {
            label: 'Registrar Lavado',
            description: 'Reportar limpieza',
            href: '/driver/log-wash',
            icon: Droplets,
            color: 'text-cyan-400',
            bg: 'bg-cyan-500/10',
            border: 'border-cyan-500/20',
            requiresVehicle: true
        },
        {
            label: 'Directorio de Flota',
            description: 'Consultar estado y conductores',
            href: '/driver/directory',
            icon: Users,
            color: 'text-indigo-400',
            bg: 'bg-indigo-500/10',
            border: 'border-indigo-500/20',
            requiresVehicle: false
        },
        {
            label: 'Zona de Descanso',
            description: '¡Juegos y relax!',
            href: '/driver/games',
            icon: Gamepad2,
            color: 'text-pink-400',
            bg: 'bg-pink-500/10',
            border: 'border-pink-500/20',
            requiresVehicle: false
        },
        {
            label: 'Manual de Usuario',
            description: 'Guía rápida para conductores',
            href: '/driver/manual',
            icon: BookOpen,
            color: 'text-sky-400',
            bg: 'bg-sky-500/10',
            border: 'border-sky-500/20',
            requiresVehicle: false
        },
    ];


    // ... omitted

    // Calculate Rank and Progress
    const currentRank = getUserRank(user?.points || 0);
    const { progress, nextRank, pointsToNext } = getNextRankProgress(user?.points || 0);

    const RankIcon = ({ name, className }: { name: string; className?: string }) => {
        switch (name) {
            case 'shield': return <Shield className={className} />;
            case 'zap': return <Zap className={className} />;
            case 'award': return <Award className={className} />;
            case 'star': return <Star className={className} />;
            case 'crown': return <Crown className={className} />;
            case 'trophy': return <Trophy className={className} />;
            default: return <Medal className={className} />;
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary-500/30">
            <main className="max-w-md mx-auto px-4 pb-20 pt-8 lg:pt-12 lg:max-w-4xl">
                {/* Header Section (Greeting Only) */}
                <div className="flex flex-col">
                    <div className="flex items-center gap-3 mb-1">
                        <h1 className="text-2xl font-display font-bold text-foreground">
                            Hola, {user.name.split(' ')[0]} 👋
                        </h1>
                        {user.points !== undefined && (
                            <div className="flex items-center gap-1.5 bg-yellow-500/10 px-3 py-1 rounded-full border border-yellow-500/20 shadow-sm animate-in zoom-in duration-500">
                                <Trophy className="w-4 h-4 text-yellow-500" />
                                <span className="text-sm font-bold text-yellow-500">{user.points}</span>
                            </div>
                        )}
                    </div>
                    <p className="text-muted-foreground text-sm">
                        ¿Qué tarea vamos a realizar ahora?
                    </p>
                </div>

                {/* Quick Stats / Gamification Banner */}
                <div className="mt-6 mb-8 p-6 rounded-2xl bg-card border border-border relative overflow-hidden shadow-sm group">
                    {/* Background Glow */}
                    <div className={`absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 rounded-full blur-3xl opacity-10 transition-colors duration-500 ${currentRank.color.replace('text', 'bg')}`}></div>

                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className={`p-2.5 rounded-xl bg-muted border border-border ${currentRank.color}`}>
                                    <RankIcon name={currentRank.icon} className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-0.5">Rango Actual</p>
                                    <p className={`text-xl font-black tracking-tight ${currentRank.color}`}>{currentRank.name}</p>
                                </div>
                            </div>
                            {nextRank && (
                                <div className="text-right">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-0.5">Faltan</p>
                                    <p className="text-sm font-bold text-foreground">{pointsToNext} pts</p>
                                </div>
                            )}
                        </div>

                        {/* Progress Bar Container */}
                        <div className="space-y-2">
                            <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden border border-border/50">
                                <div
                                    className={`h-full transition-all duration-1000 ease-out rounded-full ${currentRank.color.replace('text', 'bg')}`}
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>
                            {nextRank && (
                                <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest px-1">
                                    <span>{currentRank.minPoints}</span>
                                    <span className="text-foreground/40 italic">Siguiente: {nextRank.name}</span>
                                    <span>{nextRank.minPoints}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Fuel Level Natural Language Alert (Issue #15) */}
                {assignedVehicle && assignedVehicle.fuelLevel !== undefined && (
                    <div className="mb-8 p-4 rounded-xl bg-card border border-border flex items-start gap-4 shadow-sm animate-in slide-in-from-bottom-2 duration-300">
                        <div className="p-2 rounded-lg bg-primary/10">
                            <Fuel className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-foreground">Estado del Combustible</h4>
                            <p className={`text-sm mt-0.5 ${getFuelLevelMessage(assignedVehicle.fuelLevel).color}`}>
                                {getFuelLevelMessage(assignedVehicle.fuelLevel).message}
                            </p>
                        </div>
                    </div>
                )}

                {/* Action Grid */}
                <div className="grid grid-cols-1 gap-4">
                    {quickActions.map((action) => {
                        const isLocked = action.requiresVehicle && !user?.assignedVehicleId;

                        return (
                            <Link
                                key={action.href}
                                href={isLocked ? '#' : action.href}
                                onClick={(e) => {
                                    if (isLocked) {
                                        e.preventDefault();
                                        alert('⚠️ Primero debes seleccionar un vehículo para realizar esta acción.');
                                    }
                                }}
                                className={`group relative overflow-hidden bg-card border border-border p-4 rounded-xl transition-all duration-200 shadow-sm ${isLocked ? 'opacity-50 cursor-not-allowed grayscale' : 'hover:bg-muted/50'
                                    }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-lg bg-muted border border-border ${!isLocked && 'group-hover:bg-background'} transition-colors`}>
                                        <action.icon className={`w-6 h-6 text-foreground`} />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-lg font-bold text-foreground leading-tight mb-0.5">{action.label}</h3>
                                        <p className="text-sm text-muted-foreground">{action.description}</p>
                                    </div>
                                    <div className="text-muted-foreground group-hover:text-primary transition-colors flex items-center gap-2">
                                        {/* Return Button Logic */}
                                        {/* @ts-ignore - Custom property */}
                                        {action.isVehicleCard && user?.assignedVehicleId && assignedVehicle && (
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    setShowReturnModal(true);
                                                }}
                                                className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors mr-2 flex items-center gap-2 text-xs font-bold"
                                                title="Devolver Vehículo"
                                            >
                                                <LogOut className="w-4 h-4" />
                                                <span className="hidden sm:inline">Devolver</span>
                                            </button>
                                        )}
                                        {isLocked ? <Lock className="w-5 h-5 text-muted-foreground" /> : <ArrowRight className="w-5 h-5" />}
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>

                {/* Recent Activity Mini-Feed */}
                <div className="mt-10">
                    <h3 className="text-lg font-bold text-foreground mb-4">Actividad reciente</h3>
                    <div className="bg-card border border-border rounded-xl p-6 text-center shadow-sm">
                        <p className="text-sm text-muted-foreground">No hay actividad reciente para mostrar</p>
                    </div>
                </div>

                {/* Return Modal */}
                {showReturnModal && assignedVehicle && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-card w-full max-w-md rounded-2xl p-6 shadow-xl border border-border animate-in zoom-in-95 duration-200">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-bold text-foreground">Devolver Vehículo</h3>
                                <button onClick={() => setShowReturnModal(false)} className="p-1 hover:bg-muted rounded-full transition-colors">
                                    <X className="w-6 h-6 text-muted-foreground" />
                                </button>
                            </div>

                            <p className="text-muted-foreground mb-6">
                                ¿Estás seguro de que deseas devolver el vehículo <strong>{assignedVehicle.brand} {assignedVehicle.model}</strong>?
                            </p>

                            {assignedVehicle.requiresParkingSpot && (
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
                                    disabled={returning || (assignedVehicle.requiresParkingSpot && !parkingLocation.trim())}
                                    className="flex-1 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl shadow-lg shadow-primary/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {returning ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white"></div> : 'Confirmar'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div >
    );
}
