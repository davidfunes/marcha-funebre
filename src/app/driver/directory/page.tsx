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
    MapPin
} from 'lucide-react';
import Link from 'next/link';

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
                            <div key={vehicle.id} className="bg-card border border-border rounded-xl p-4 shadow-sm flex items-center gap-4">
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
        </div>
    );
}
