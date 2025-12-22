'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase/firebase';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, orderBy, limit, Timestamp } from 'firebase/firestore';
import { Vehicle, RentingCompany, MaintenanceRecord } from '@/types';
import {
    Car,
    Calendar,
    Fuel,
    Settings,
    AlertTriangle,
    ArrowLeft,
    LogOut,
    MapPin,
    X,
    Phone,
    Map,
    Music,
    Search,
    Loader2,
    Clock,
    Package,
    ChevronRight,
    SearchIcon
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { getInventory, getVehicles, reportMaterialIncident } from '@/services/FirebaseService';
import { InventoryItem, Incident, MaterialCondition } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { updateItem } from '@/services/FirebaseService';

export default function MyVehiclePage() {
    const { user } = useAuth();
    const router = useRouter();
    const [vehicle, setVehicle] = useState<Vehicle | null>(null);
    const [rentingCompany, setRentingCompany] = useState<RentingCompany | null>(null);
    const [nextAppointment, setNextAppointment] = useState<MaintenanceRecord | null>(null); // New state
    const [loading, setLoading] = useState(true);
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [parkingLocation, setParkingLocation] = useState('');
    const [returning, setReturning] = useState(false);

    // Material List & Incident State
    const [material, setMaterial] = useState<InventoryItem[]>([]);
    const [isLoadingMaterial, setIsLoadingMaterial] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
    const [isReporting, setIsReporting] = useState(false);
    const [formData, setFormData] = useState<Partial<Incident> & { condition: MaterialCondition | '' }>({
        title: '',
        description: '',
        condition: ''
    });

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

                // Fetch material if vehicle found
                if (vehicleData?.id) {
                    const allInventory = await getInventory();
                    const vehicleMaterial = allInventory.filter(item =>
                        (item.locations || []).some(loc => loc.type === 'vehicle' && loc.id === vehicleData?.id)
                    );
                    setMaterial(vehicleMaterial);
                }
            } catch (err) {
                console.error('Error fetching vehicle/material:', err);
            } finally {
                setLoading(false);
                setIsLoadingMaterial(false);
            }
        };

        const fetchRentingCompany = async (companyId: string) => {
            try {
                const docRef = doc(db, 'renting_companies', companyId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setRentingCompany({ id: docSnap.id, ...docSnap.data() } as RentingCompany);
                }
            } catch (error) {
                console.error("Error fetching renting company:", error);
            }
        };

        fetchVehicle();
    }, [user]);

    // Effect to fetch renting company and next appointment when vehicle is loaded
    useEffect(() => {
        if (vehicle) {
            if (vehicle.rentingCompanyId) {
                const fetchRenting = async () => {
                    try {
                        const docRef = doc(db, 'renting_companies', vehicle.rentingCompanyId!);
                        const docSnap = await getDoc(docRef);
                        if (docSnap.exists()) {
                            setRentingCompany({ id: docSnap.id, ...docSnap.data() } as RentingCompany);
                        }
                    } catch (error) {
                        console.error("Error fetching renting company:", error);
                    }
                };
                fetchRenting();
            } else {
                setRentingCompany(null);
            }

            // Fetch Next Appointment
            const fetchNextAppointment = async () => {
                try {
                    const now = Timestamp.now();
                    const q = query(
                        collection(db, 'maintenance'),
                        where('vehicleId', '==', vehicle.id),
                        where('status', '==', 'scheduled'),
                        where('date', '>=', now),
                        orderBy('date', 'asc'),
                        limit(1)
                    );
                    const snapshot = await getDocs(q);
                    if (!snapshot.empty) {
                        const data = snapshot.docs[0].data() as MaintenanceRecord;
                        setNextAppointment({ id: snapshot.docs[0].id, ...data });
                    } else {
                        setNextAppointment(null);
                    }
                } catch (error) {
                    console.error("Error fetching appointments:", error);
                }
            };
            fetchNextAppointment();
        }
    }, [vehicle]);

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

    const getAppointmentDate = (date: any) => {
        if (!date) return null;
        return date.seconds ? new Date(date.seconds * 1000) : new Date(date);
    };

    const handleReportIncident = (item: InventoryItem) => {
        setSelectedItem(item);
        setFormData({
            title: `Incidencia: ${item.name}`,
            description: '',
            priority: 'medium',
            condition: ''
        });
        setIsModalOpen(true);
    };

    const handleSubmitIncident = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedItem || !user || !vehicle?.id) return;
        if (!formData.condition) {
            alert('Por favor, selecciona el estado del material.');
            return;
        }

        setIsReporting(true);
        try {
            await reportMaterialIncident(
                {
                    title: formData.title,
                    description: formData.description,
                    priority: formData.condition === 'totally_broken' ? 'high' : 'medium',
                    reportedByUserId: user.id!,
                    vehicleId: vehicle.id
                },
                selectedItem.id!,
                vehicle.id,
                formData.condition as MaterialCondition
            );

            // Optimistic update
            setMaterial(prev => prev.map(item => {
                if (item.id === selectedItem.id) {
                    const locations = [...(item.locations || [])];
                    const vIdx = locations.findIndex(l =>
                        l.id === vehicle.id &&
                        (l.status === 'new' || l.status === 'working_urgent_change' || !l.status)
                    );

                    if (vIdx !== -1) {
                        if (locations[vIdx].quantity > 1) {
                            locations[vIdx].quantity -= 1;
                            locations.push({
                                ...locations[vIdx],
                                quantity: 1,
                                status: formData.condition as MaterialCondition
                            });
                        } else {
                            locations[vIdx].status = formData.condition as MaterialCondition;
                        }
                    }
                    return { ...item, locations };
                }
                return item;
            }));

            setIsModalOpen(false);
            setSelectedItem(null);
            alert('Incidencia reportada correctamente.');
        } catch (error) {
            console.error("Error reporting incident:", error);
            alert('Error al reportar la incidencia.');
        } finally {
            setIsReporting(false);
        }
    };

    const filteredMaterial = material.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
                    {/* Next Appointment Card - DYNAMIC */}
                    <div className={`
                        p-4 rounded-xl border flex items-center gap-4 transition-colors
                        ${nextAppointment
                            ? 'bg-primary/5 border-primary/20'
                            : 'bg-card border-border'}
                    `}>
                        <div className={`
                            p-3 rounded-lg flex items-center justify-center
                            ${nextAppointment ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}
                        `}>
                            <Calendar className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-medium text-muted-foreground">Próxima Cita Taller</p>
                            {nextAppointment ? (
                                <div>
                                    <p className="font-bold text-primary text-lg">
                                        {format(getAppointmentDate(nextAppointment.date)!, 'd MMM, HH:mm', { locale: es })}
                                    </p>
                                    <p className="text-sm text-foreground/80 truncate max-w-[200px]">
                                        {nextAppointment.garageName || 'Taller Asignado'}
                                    </p>
                                </div>
                            ) : (
                                <p className="font-semibold text-foreground/50 italic">
                                    No hay citas programadas
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Material Section Integrated */}
                    <div className="space-y-4 pt-4 border-t border-border">
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-foreground">Material del Vehículo</h3>
                            <div className="relative w-1/2">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="Buscar..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-muted/50 border border-border rounded-lg py-1.5 pl-9 pr-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            {isLoadingMaterial ? (
                                <div className="flex justify-center py-4">
                                    <Loader2 className="h-6 w-6 text-primary animate-spin" />
                                </div>
                            ) : filteredMaterial.length > 0 ? (
                                filteredMaterial.map((item) => {
                                    const loc = (item.locations || []).find(l => l.id === vehicle.id);
                                    const qty = loc?.quantity || 0;
                                    const status = loc?.status;

                                    return (
                                        <div key={item.id} className="bg-muted/30 rounded-xl p-3 flex items-center gap-3 border border-border/50">
                                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                                <Music className="h-5 w-5 text-primary" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start">
                                                    <p className="text-sm font-semibold truncate leading-tight">{item.name}</p>
                                                    <span className="text-[10px] bg-primary/20 text-primary px-1.5 rounded-full font-bold">x{qty}</span>
                                                </div>
                                                {status === 'ordered' && (
                                                    <p className="text-[10px] text-blue-500 font-bold uppercase mt-0.5 flex items-center gap-1">
                                                        <Clock className="h-3 w-3" /> Material Pedido
                                                    </p>
                                                )}
                                                {status === 'working_urgent_change' && (
                                                    <p className="text-[10px] text-amber-500 font-bold uppercase mt-0.5 flex items-center gap-1">
                                                        <AlertTriangle className="h-3 w-3" /> Urge Cambio
                                                    </p>
                                                )}
                                                {(status === 'totally_broken' || (status as any) === 'broken') && (
                                                    <p className="text-[10px] text-red-500 font-bold uppercase mt-0.5 flex items-center gap-1">
                                                        <AlertTriangle className="h-3 w-3" /> Roto Total
                                                    </p>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => handleReportIncident(item)}
                                                disabled={status === 'totally_broken' || status === 'ordered'}
                                                className={`p-2 rounded-lg transition-all ${(status === 'totally_broken' || status === 'ordered')
                                                    ? 'opacity-20 cursor-not-allowed'
                                                    : 'hover:bg-red-500/10 text-muted-foreground hover:text-red-500'
                                                    }`}
                                            >
                                                <AlertTriangle className="h-4 w-4" />
                                            </button>
                                        </div>
                                    );
                                })
                            ) : (
                                <p className="text-xs text-muted-foreground text-center py-4 italic">No se encontró material</p>
                            )}
                        </div>
                    </div>

                    {rentingCompany && (
                        <div className="bg-card p-4 rounded-xl border border-border flex items-center gap-4">
                            <div className="bg-green-500/10 p-3 rounded-lg text-green-500">
                                <Phone className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Asistencia {rentingCompany.name}</p>
                                <a href={`tel:${rentingCompany.phone}`} className="font-bold text-lg text-green-600 hover:underline">
                                    {rentingCompany.phone}
                                </a>
                            </div>
                        </div>
                    )}
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

            {/* Incident Modal Integrated */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => !isReporting && setIsModalOpen(false)}
                title="Reportar Incidencia de Material"
            >
                <form onSubmit={handleSubmitIncident} className="space-y-4 pt-4 text-foreground">
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-900 dark:text-amber-100 italic">
                            El material permanecerá vinculado con su estado actualizado.
                        </p>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-muted-foreground uppercase px-1">Estado</label>
                        <select
                            required
                            value={formData.condition}
                            onChange={(e) => setFormData({ ...formData, condition: e.target.value as MaterialCondition })}
                            className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                        >
                            <option value="" disabled>Selecciona...</option>
                            <option value="working_urgent_change">Funciona pero urge un cambio</option>
                            <option value="totally_broken">Roto completamente (Roto Total)</option>
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-muted-foreground uppercase px-1">Descripción</label>
                        <textarea
                            rows={3}
                            required
                            placeholder="¿Qué ha pasado?"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none resize-none"
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="flex-1 bg-muted py-3 rounded-xl text-sm font-medium"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isReporting || !formData.condition}
                            className="flex-1 bg-primary text-primary-foreground py-3 rounded-xl font-bold shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center justify-center"
                        >
                            {isReporting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
