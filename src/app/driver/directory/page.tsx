'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { Vehicle } from '@/types';
import {
    Search,
    Car,
    User,
    ArrowLeft,
    Filter,
    MapPin,
    Fuel,
    Settings,
    Calendar,
    Music,
    Clock,
    AlertTriangle,
    X,
    Loader2
} from 'lucide-react';
import Link from 'next/link';
import { getFuelLevelMessage } from '@/utils/fuelUtils';

interface DriverMap {
    [userId: string]: string; // userId -> userName
}

interface WarehouseMap {
    [id: string]: string; // id -> name
}

export default function DirectoryPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [drivers, setDrivers] = useState<DriverMap>({});
    const [warehouses, setWarehouses] = useState<WarehouseMap>({});
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState<'all' | 'available' | 'occupied'>('all');

    // Modal State
    const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
    const [vehicleMaterial, setVehicleMaterial] = useState<any[]>([]);
    const [isLoadingMaterial, setIsLoadingMaterial] = useState(false);

    const fetchVehicleMaterial = async (vehicleId: string) => {
        setIsLoadingMaterial(true);
        try {
            const q = query(
                collection(db, 'inventory'),
                where('locations', 'array-contains-any', [
                    { id: vehicleId, type: 'vehicle', quantity: 1 }, // this won't work perfectly with array-contains-any if quantities vary
                ])
            );
            // Actually, because of how Firestore works with arrays of objects, fetching all and filtering is safer if we don't have a better index
            const allQ = query(collection(db, 'inventory'));
            const snapshot = await getDocs(allQ);
            const material: any[] = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                const itemLocations = (data.locations || []).filter((l: any) => l.id === vehicleId && l.type === 'vehicle');
                if (itemLocations.length > 0) {
                    material.push({ id: doc.id, ...data });
                }
            });
            setVehicleMaterial(material);
        } catch (error) {
            console.error('Error fetching material:', error);
        } finally {
            setIsLoadingMaterial(false);
        }
    };

    const handleOpenDetails = (vehicle: Vehicle) => {
        setSelectedVehicle(vehicle);
        fetchVehicleMaterial(vehicle.id!);
    };

    useEffect(() => {
        if (!authLoading) {
            if (!user) {
                router.push('/login');
            } else if (user.role !== 'conductor' && user.role !== 'admin' && user.role !== 'manager') {
                router.push('/admin/dashboard');
            }
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Parallel fetch: Vehicles and Warehouses
                const [vehicleSnap, warehouseSnap] = await Promise.all([
                    getDocs(query(collection(db, 'vehicles'))),
                    getDocs(collection(db, 'warehouses'))
                ]);

                // Process Warehouses
                const warehouseMap: WarehouseMap = {};
                warehouseSnap.forEach(doc => {
                    warehouseMap[doc.id] = doc.data().name;
                });
                setWarehouses(warehouseMap);

                // Process Vehicles
                const vehicleList: Vehicle[] = [];
                const driverIds = new Set<string>();

                vehicleSnap.forEach(doc => {
                    const data = doc.data() as Vehicle;
                    if (data.status !== 'retired' && !data.isManagement) {
                        vehicleList.push({ id: doc.id, ...data });
                        if (data.assignedDriverId) {
                            driverIds.add(data.assignedDriverId);
                        }
                    }
                });

                setVehicles(vehicleList);

                // 2. Fetch Drivers (Optimized: only those assigned)
                // Firestore 'in' query supports up to 10 items. If we have more, better to fetch all drivers or batch.
                // For simplicity/reliability in this scope, let's fetch all users with role 'conductor'.
                // Or better: iterate and fetch individual docs in parallel (Promise.all)

                const driverMap: DriverMap = {};
                const driverFetchPromises = Array.from(driverIds).map(async (uid) => {
                    try {
                        const userDoc = await getDoc(doc(db, 'users', uid));
                        if (userDoc.exists()) {
                            driverMap[uid] = userDoc.data().name || 'Desconocido';
                        }
                    } catch (e) {
                        console.error(`Failed to fetch driver ${uid}`, e);
                    }
                });

                await Promise.all(driverFetchPromises);
                setDrivers(driverMap);

            } catch (error) {
                console.error('Error fetching directory data:', error);
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            fetchData();
        }
    }, [user]);

    const filteredVehicles = vehicles.filter(v => {
        const matchesSearch =
            v.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            v.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
            v.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (v.assignedDriverId && drivers[v.assignedDriverId]?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (v.warehouseId && warehouses[v.warehouseId]?.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesFilter =
            filter === 'all' ? true :
                filter === 'available' ? (!v.assignedDriverId && v.status === 'active') :
                    filter === 'occupied' ? (!!v.assignedDriverId) : true;

        return matchesSearch && matchesFilter;
    });

    if (loading || authLoading) {
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
                <h1 className="text-xl font-bold font-display">Directorio de Flota</h1>
            </div>

            <main className="p-4 max-w-lg mx-auto">

                {/* Search & Filter */}
                <div className="sticky top-[73px] z-10 bg-background/95 backdrop-blur py-2 space-y-3 mb-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Buscar coche, matrícula, sede..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-card border border-input rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition shadow-sm"
                        />
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${filter === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                        >
                            Todos
                        </button>
                        <button
                            onClick={() => setFilter('available')}
                            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${filter === 'available' ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                        >
                            Disponibles
                        </button>
                        <button
                            onClick={() => setFilter('occupied')}
                            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${filter === 'occupied' ? 'bg-amber-500 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                        >
                            Ocupados
                        </button>
                    </div>
                </div>

                {/* List */}
                <div className="space-y-4">
                    {filteredVehicles.length === 0 ? (
                        <div className="text-center py-10 opacity-50">
                            <Car className="w-12 h-12 mx-auto mb-2" />
                            <p>No se encontraron vehículos</p>
                        </div>
                    ) : (
                        filteredVehicles.map(vehicle => (
                            <div
                                key={vehicle.id}
                                onClick={() => handleOpenDetails(vehicle)}
                                className="bg-card border border-border rounded-xl p-4 shadow-sm flex items-center gap-4 cursor-pointer hover:border-primary/50 transition-all active:scale-[0.98]"
                            >
                                <div className="w-14 h-14 bg-muted rounded-lg flex items-center justify-center shrink-0 overflow-hidden relative">
                                    {vehicle.image ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={vehicle.image} alt={vehicle.model} className="w-full h-full object-cover" />
                                    ) : (
                                        <Car className="w-7 h-7 text-muted-foreground/50" />
                                    )}
                                    {/* Status Dot */}
                                    <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-card ${vehicle.status === 'maintenance' ? 'bg-red-500' :
                                        vehicle.assignedDriverId ? 'bg-amber-500' : 'bg-green-500'
                                        }`}></div>
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-bold text-foreground truncate">{vehicle.brand} {vehicle.model}</h3>
                                        <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{vehicle.plate}</span>
                                    </div>

                                    {vehicle.warehouseId && (
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1 truncate">
                                            <MapPin className="w-3 h-3 text-muted-foreground/70" />
                                            <span>{warehouses[vehicle.warehouseId] || 'Sede Desconocida'}</span>
                                        </div>
                                    )}

                                    <div className="mt-1 flex items-center gap-2">
                                        {vehicle.status === 'maintenance' ? (
                                            <span className="text-xs text-red-500 font-medium flex items-center gap-1">
                                                <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div> En Taller
                                            </span>
                                        ) : vehicle.assignedDriverId ? (
                                            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1 truncate">
                                                <User className="w-3 h-3" />
                                                {drivers[vehicle.assignedDriverId] || 'Cargando...'}
                                            </span>
                                        ) : (
                                            <span className="text-xs text-green-500 font-medium flex items-center gap-1">
                                                <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div> Disponible
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </main>

            {/* Vehicle Detail Modal */}
            {selectedVehicle && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedVehicle(null)} />

                    <div className="relative w-full max-w-lg bg-card border-t sm:border border-border rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300 max-h-[90vh] flex flex-col">
                        {/* Modal Header */}
                        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
                            <h2 className="font-bold text-lg flex items-center gap-2">
                                <Car className="w-5 h-5 text-primary" />
                                Detalles del Vehículo
                            </h2>
                            <button
                                onClick={() => setSelectedVehicle(null)}
                                className="p-2 hover:bg-muted rounded-full transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
                            {/* Main Info */}
                            <div className="flex gap-4">
                                <div className="w-24 h-24 bg-muted rounded-xl flex items-center justify-center shrink-0 overflow-hidden border border-border">
                                    {selectedVehicle.image ? (
                                        <img src={selectedVehicle.image} alt={selectedVehicle.model} className="w-full h-full object-cover" />
                                    ) : (
                                        <Car className="w-10 h-10 text-muted-foreground/30" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-xl font-bold text-foreground leading-tight">{selectedVehicle.brand} {selectedVehicle.model}</h3>
                                    <p className="text-lg font-mono text-muted-foreground mt-1">{selectedVehicle.plate}</p>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${selectedVehicle.status === 'maintenance' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                            selectedVehicle.assignedDriverId ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-green-500/10 text-green-500 border-green-500/20'
                                            }`}>
                                            {selectedVehicle.status === 'maintenance' ? 'Mantenimiento' :
                                                selectedVehicle.assignedDriverId ? 'En Uso' : 'Disponible'}
                                        </span>
                                        {selectedVehicle.requiresParkingSpot && (
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-blue-500/10 text-blue-500 border border-blue-500/20">
                                                Requiere Parking
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 rounded-xl bg-muted/50 border border-border">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Odómetro</p>
                                    <div className="flex items-center gap-2">
                                        <Settings className="w-4 h-4 text-primary" />
                                        <span className="font-bold">{selectedVehicle.odometer?.toLocaleString()} km</span>
                                    </div>
                                </div>
                                <div className="p-3 rounded-xl bg-muted/50 border border-border">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Combustible</p>
                                    <div className="flex flex-col gap-0.5">
                                        <div className="flex items-center gap-2">
                                            <Fuel className="w-4 h-4 text-primary" />
                                            <span className="font-bold">{selectedVehicle.fuelType} {selectedVehicle.fuelLevel}%</span>
                                        </div>
                                        {selectedVehicle.fuelLevel !== undefined && (
                                            <p className={`text-[9px] font-medium ${getFuelLevelMessage(selectedVehicle.fuelLevel).color}`}>
                                                {getFuelLevelMessage(selectedVehicle.fuelLevel).message}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Location Info */}
                            {selectedVehicle.warehouseId && (
                                <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex items-start gap-3">
                                    <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-xs font-bold text-primary uppercase tracking-wider">Sede Principal</p>
                                        <p className="text-sm font-medium text-foreground">{warehouses[selectedVehicle.warehouseId]}</p>
                                        {selectedVehicle.parkingLocation && (
                                            <p className="text-xs text-muted-foreground mt-1 italic">Visto por última vez en: {selectedVehicle.parkingLocation}</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Inventory Section */}
                            <div className="space-y-3">
                                <h4 className="text-sm font-bold text-foreground flex items-center gap-2 px-1">
                                    <Music className="w-4 h-4 text-primary" />
                                    Inventario de Material
                                </h4>

                                {isLoadingMaterial ? (
                                    <div className="flex flex-col items-center justify-center py-6 gap-2">
                                        <Loader2 className="w-6 h-6 text-primary animate-spin" />
                                        <p className="text-xs text-muted-foreground">Cargando material...</p>
                                    </div>
                                ) : vehicleMaterial.length === 0 ? (
                                    <div className="text-center py-6 bg-muted/20 rounded-xl border border-dashed border-border">
                                        <p className="text-xs text-muted-foreground italic">No hay inventario registrado</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-2">
                                        {vehicleMaterial.flatMap(item =>
                                            (item.locations || [])
                                                .filter((l: any) => l.id === selectedVehicle.id && l.type === 'vehicle')
                                                .map((loc: any, idx: number) => {
                                                    const status = loc.status;
                                                    const isBroken = status === 'totally_broken' || (status as any) === 'broken';
                                                    const isOrdered = status === 'ordered';
                                                    const isUrgent = status === 'working_urgent_change';

                                                    return (
                                                        <div key={`${item.id}-${idx}`} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border border-border/50">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center border border-border">
                                                                    <Music className="w-4 h-4 text-muted-foreground" />
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-bold">{item.name}</p>
                                                                    {(isBroken || isOrdered || isUrgent) && (
                                                                        <p className={`text-[10px] font-bold uppercase ${isBroken ? 'text-red-500' :
                                                                            isOrdered ? 'text-blue-500' : 'text-amber-500'
                                                                            }`}>
                                                                            {isBroken ? 'Roto' :
                                                                                isOrdered ? 'Pedido' : 'Urge Cambio'}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <span className="text-xs font-black bg-primary/10 text-primary px-2 py-1 rounded-lg">x{loc.quantity || 0}</span>
                                                        </div>
                                                    );
                                                })
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t border-border bg-muted/30 flex justify-end">
                            <button
                                onClick={() => setSelectedVehicle(null)}
                                className="px-6 py-2.5 bg-foreground text-background rounded-xl font-bold text-sm hover:opacity-90 transition-opacity"
                            >
                                Entendido
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
