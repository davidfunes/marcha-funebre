'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
    LayoutDashboard,
    Car,
    Music,
    AlertTriangle,
    Users,
    FileText,
    Wrench,
    LogOut,
    Warehouse as WarehouseIcon,
    Building2,
    Database,
    TrendingUp,
    DollarSign,
    Activity,
    Percent,
    ArrowUpRight,
    ArrowDownRight,
    Check
} from 'lucide-react';
import Link from 'next/link';
import { Modal } from '@/components/ui/Modal';
import { getVehicles, getIncidents, getInventory, getUsers, getWarehouses, updateItem, addItem } from '@/services/FirebaseService';
import { seedDatabase } from '@/services/seed';
import { Vehicle, Incident, InventoryItem, User, Warehouse } from '@/types';
import { Timestamp } from 'firebase/firestore';
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend,
    CategoryScale,
    LinearScale,
    BarElement,
    Title
} from 'chart.js';
import { Doughnut, Bar, Pie } from 'react-chartjs-2';

ChartJS.register(
    ArcElement,
    Tooltip,
    Legend,
    CategoryScale,
    LinearScale,
    BarElement,
    Title
);

export default function AdminDashboard() {
    const { user, loading, signOut } = useAuth();
    const router = useRouter();

    // Real Data State
    // Real Data State
    // Real Data State
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [isSeeding, setIsSeeding] = useState(false);

    // Modal State
    const [selectedStat, setSelectedStat] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Resolve Incident Modal State
    const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
    const [incidentToResolve, setIncidentToResolve] = useState<Incident | null>(null);

    // Vehicle Status Change Modal State
    const [isStatusChangeModalOpen, setIsStatusChangeModalOpen] = useState(false);
    const [vehicleToUpdate, setVehicleToUpdate] = useState<Vehicle | null>(null);
    const [newStatus, setNewStatus] = useState<Vehicle['status'] | null>(null);
    const [showStatusMenu, setShowStatusMenu] = useState<string | null>(null);

    // Incident Reporting Modal State
    const [isReportIncidentModalOpen, setIsReportIncidentModalOpen] = useState(false);
    const [vehicleForIncident, setVehicleForIncident] = useState<Vehicle | null>(null);
    const [incidentFormData, setIncidentFormData] = useState({
        title: '',
        description: '',
        priority: 'medium' as 'low' | 'medium' | 'high' | 'critical',
        reportedByUserId: ''
    });


    // Fetch Data
    useEffect(() => {
        if (user && user.role === 'admin') {
            const fetchData = async () => {
                try {
                    const [vData, iData, invData, uData, wData] = await Promise.all([
                        getVehicles(),
                        getIncidents(),
                        getInventory(),
                        getUsers(),
                        getWarehouses()
                    ]);
                    setVehicles(vData);
                    setIncidents(iData);
                    setInventory(invData);
                    setUsers(uData);
                    setWarehouses(wData);
                } catch (error) {
                    console.error("Error fetching dashboard data:", error);
                } finally {
                    setIsLoadingData(false);
                }
            };
            fetchData();
        }
    }, [user]);

    const handleSeed = async () => {
        setIsSeeding(true);
        await seedDatabase();
        window.location.reload();
    };

    // Broken Resolution Modal State
    const [isResolveConfirmOpen, setIsResolveConfirmOpen] = useState(false);
    const [itemToResolve, setItemToResolve] = useState<{ item: InventoryItem, locIndex: number } | null>(null);

    const handleResolveBroken = (item: InventoryItem, locIndex: number) => {
        setItemToResolve({ item, locIndex });
        setIsResolveConfirmOpen(true);
    };

    const confirmResolution = async () => {
        if (!itemToResolve) return;
        const { item, locIndex } = itemToResolve;


        try {
            const locations = [...(item.locations || [])];
            // Remove the broken entry
            locations.splice(locIndex, 1);

            // Update total quantity
            const newTotalQty = item.quantity - 1;

            if (item.id) {
                await updateItem('inventory', item.id, {
                    locations,
                    quantity: newTotalQty
                });

                // Refresh local state
                setInventory(prev => prev.map(i => i.id === item.id ? { ...i, locations, quantity: newTotalQty } : i));
            }
            setIsResolveConfirmOpen(false);
            setItemToResolve(null);
        } catch (error) {
            console.error('Error resolving broken item:', error);
            alert('Error al resolver');
        }
    };

    // --- Operational KPIs Calculations ---
    const calculateOperationalKPIs = () => {
        let totalItems = 0;
        let assignedItems = 0;
        let brokenItems = 0;

        inventory.forEach(item => {
            const qty = item.quantity || 0;

            // Operational
            totalItems += qty;
            const itemAssigned = (item.locations || []).reduce((acc, loc) => acc + loc.quantity, 0);
            assignedItems += itemAssigned;

            // Health
            const itemBroken = (item.locations || []).filter(l => l.status === 'broken').reduce((acc, l) => acc + l.quantity, 0);
            brokenItems += itemBroken;
        });

        const utilizationRate = totalItems > 0 ? (assignedItems / totalItems) * 100 : 0;
        const breakageRate = totalItems > 0 ? (brokenItems / totalItems) * 100 : 0;

        return {
            totalItems,
            utilizationRate,
            breakageRate
        };
    };

    const kpis = calculateOperationalKPIs();

    if (loading || !user || isLoadingData) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
            </div>
        );
    }

    // Dynamic Stats
    const stats = [
        { id: 'vehicles', label: 'Vehículos Total', value: vehicles.length.toString(), icon: Car, trend: 'Activos en flota' },
        { id: 'incidents', label: 'Incidencias', value: incidents.filter(i => i.status !== 'resolved').length.toString(), icon: AlertTriangle, trend: 'Pendientes de revisión' },
        { id: 'inventory', label: 'Inventario Musical', value: inventory.length.toString(), icon: Music, trend: 'En almacén' },
        { id: 'maintenance', label: 'Mantenimiento', value: vehicles.filter(v => v.status === 'maintenance').length.toString(), icon: Wrench, trend: 'En taller' },
    ];

    const menuItems = [
        { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
        { label: 'Vehículos', href: '/admin/vehicles', icon: Car },
        { label: 'Empresas Renting', href: '/admin/renting', icon: Building2 },
        { label: 'Inventario', href: '/admin/inventory', icon: Music },
        { label: 'Almacenes', href: '/admin/warehouses', icon: WarehouseIcon },
        { label: 'Incidencias', href: '/admin/incidents', icon: AlertTriangle },
        { label: 'Conductores', href: '/admin/users', icon: Users },
        { label: 'Mantenimiento', href: '/admin/maintenance', icon: Wrench },
        { label: 'Reportes', href: '/admin/reports', icon: FileText },
    ];

    const handleStatClick = (statId: string) => {
        setSelectedStat(statId);
        setIsModalOpen(true);
    };

    const handleResolveIncident = async () => {
        if (incidentToResolve?.id) {
            // Optimistic update: remove from local state immediately
            setIncidents(prev => prev.map(i =>
                i.id === incidentToResolve.id ? { ...i, status: 'resolved' as any } : i
            ));
            // Update in database
            await updateItem('incidents', incidentToResolve.id, { status: 'resolved' });
            // Close modal
            setIsResolveModalOpen(false);
            setIncidentToResolve(null);
        }
    };

    const handleVehicleStatusChange = async () => {
        if (vehicleToUpdate?.id && newStatus) {
            // Optimistic update
            setVehicles(prev => prev.map(v =>
                v.id === vehicleToUpdate.id ? { ...v, status: newStatus } : v
            ));
            // Update in database
            await updateItem('vehicles', vehicleToUpdate.id, { status: newStatus });
            // Close modal
            setIsStatusChangeModalOpen(false);
            setVehicleToUpdate(null);
            setNewStatus(null);
        }
    };

    const handleOpenReportIncident = (vehicle: Vehicle) => {
        setVehicleForIncident(vehicle);
        setIncidentFormData({
            title: '',
            description: '',
            priority: 'medium',
            reportedByUserId: users[0]?.id || ''
        });
        setIsReportIncidentModalOpen(true);
    };

    const handleSubmitIncident = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!vehicleForIncident?.id) return;

        const newIncident = {
            ...incidentFormData,
            vehicleId: vehicleForIncident.id,
            status: 'open' as const,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        };

        // Optimistic update
        const tempIncident = { ...newIncident, id: 'temp-' + Date.now() } as Incident;
        setIncidents(prev => [tempIncident, ...prev]);

        // Save to database
        await addItem('incidents', newIncident);

        // Close modal
        setIsReportIncidentModalOpen(false);
        setVehicleForIncident(null);
    };

    const renderModalContent = () => {
        switch (selectedStat) {
            case 'vehicles':
                return (
                    <div className="space-y-3">
                        {vehicles.map(v => (
                            <div key={v.id} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <Car className="h-4 w-4 text-primary" />
                                    <div>
                                        <p className="text-sm font-medium">{v.brand} {v.model}</p>
                                        <p className="text-xs text-muted-foreground">{v.plate}</p>
                                    </div>
                                </div>
                                <span className={`text-xs px-2 py-1 rounded-full ${v.status === 'active' ? 'bg-green-100 text-green-700' :
                                    v.status === 'maintenance' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                                    }`}>
                                    {v.status}
                                </span>
                            </div>
                        ))}
                    </div>
                );
            case 'incidents':
                return (
                    <div className="space-y-3">
                        {incidents.filter(i => i.status !== 'resolved').length > 0 ? incidents.filter(i => i.status !== 'resolved').map(i => {
                            const relatedVehicle = vehicles.find(v => v.id === i.vehicleId);
                            const reporter = users.find(u => u.id === i.reportedByUserId);

                            return (
                                <div key={i.id} className="p-3 bg-muted/20 rounded-lg space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                                            <div>
                                                <p className="text-sm font-medium">{i.title}</p>
                                                <p className="text-xs text-muted-foreground">{i.priority.toUpperCase()}</p>
                                            </div>
                                        </div>
                                        <span className="text-xs uppercase bg-secondary px-2 py-1 rounded">{i.status}</span>
                                    </div>

                                    <div className="text-xs text-muted-foreground pl-7 space-y-1">
                                        {relatedVehicle && (
                                            <p className="flex items-center gap-1">
                                                <Car className="h-3 w-3" />
                                                Vehículo: <span className="font-medium text-foreground">{relatedVehicle.brand} {relatedVehicle.model} ({relatedVehicle.plate})</span>
                                            </p>
                                        )}
                                        {reporter && (
                                            <p className="flex items-center gap-1">
                                                <Users className="h-3 w-3" />
                                                Reportado por: <span className="font-medium text-foreground">{reporter.name}</span>
                                            </p>
                                        )}
                                    </div>
                                </div>
                            );
                        }) : <p className="text-muted-foreground text-center py-4">No hay incidencias activas</p>}
                    </div>
                );
            case 'inventory':
                return (
                    <div className="space-y-3">
                        {inventory.slice(0, 50).map(i => {
                            let locationName = 'Sin asignar';
                            if (i.vehicleId) {
                                const v = vehicles.find(v => v.id === i.vehicleId);
                                locationName = v ? `🚗 ${v.brand} ${v.model}` : 'Vehículo desconocido';
                            } else if (i.warehouseId) {
                                const w = warehouses.find(w => w.id === i.warehouseId);
                                locationName = w ? `🏭 ${w.name}` : 'Almacén desconocido';
                            }

                            return (
                                <div key={i.id} className="p-3 bg-muted/20 rounded-lg space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Music className="h-4 w-4 text-purple-500" />
                                            <div>
                                                <p className="text-sm font-medium">{i.name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {i.brand} {i.model}
                                                </p>
                                            </div>
                                        </div>
                                        <span className="text-xs bg-secondary px-2 py-1 rounded capitalize">{i.category}</span>
                                    </div>

                                    <div className="text-xs text-muted-foreground pl-7 grid grid-cols-2 gap-2">
                                        <p>Ref: <span className="font-mono text-foreground">{i.sku}</span></p>
                                        <p>Stock: <span className="font-medium text-foreground">{i.quantity}</span></p>
                                        <p className="col-span-2 text-foreground font-medium">{locationName}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                );
            case 'maintenance':
                const maintenanceVehicles = vehicles.filter(v => v.status === 'maintenance');
                return (
                    <div className="space-y-3">
                        {maintenanceVehicles.length > 0 ? maintenanceVehicles.map(v => (
                            <div key={v.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <Wrench className="h-4 w-4 text-red-500" />
                                    <div>
                                        <p className="text-sm font-medium text-red-900">{v.brand} {v.model}</p>
                                        <p className="text-xs text-red-600">{v.plate}</p>
                                    </div>
                                </div>
                            </div>
                        )) : <p className="text-muted-foreground text-center py-4">No hay vehículos en mantenimiento</p>}
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
                    <p className="text-muted-foreground mt-2">Bienvenido de nuevo, {user?.name}</p>
                </div>
                <div className="flex items-center gap-2">
                    {/* Actions can go here */}
                </div>
            </div>

            {/* Empty State / Seeder */}
            {(vehicles.length === 0 || inventory.length === 0) && (
                <div className="rounded-xl border-2 border-dashed border-primary/50 bg-primary/5 p-8 text-center animate-in fade-in">
                    <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                        <Database className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Base de Datos Incompleta</h3>
                    <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                        Parece que faltan datos (Vehículos o Inventario). Como Senior Dev, he preparado un script automático para poblar la base de datos con registros de prueba.
                    </p>
                    <button
                        onClick={handleSeed}
                        disabled={isSeeding}
                        className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:opacity-50"
                    >
                        {isSeeding ? 'Sembrando datos...' : 'Generar Datos de Prueba (Seed DB)'}
                    </button>
                </div>
            )}


            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) => (
                    <div
                        key={stat.label}
                        onClick={() => handleStatClick(stat.id)}
                        className="rounded-xl border border-border bg-card p-6 shadow-sm hover:shadow-md transition-all cursor-pointer block group"
                    >
                        <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <span className="text-sm font-medium text-muted-foreground group-hover:text-primary transition-colors">{stat.label}</span>
                            <stat.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                        <div className="text-2xl font-bold">{stat.value}</div>
                        <p className="text-xs text-muted-foreground mt-1">{stat.trend}</p>
                    </div>
                ))}
            </div>

            {/* Operational Metrics */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                            <Activity className="h-5 w-5 text-primary" />
                            Métricas Operativas
                        </h3>
                        <p className="text-sm text-muted-foreground">Visión operativa del inventario y flota.</p>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    {/* Utilization Card */}
                    <div className="rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-6 shadow-sm">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium text-emerald-600 mb-1">Tasa de Utilización</p>
                                <h4 className="text-2xl font-bold text-emerald-900">
                                    {kpis.utilizationRate.toFixed(1)}%
                                </h4>
                            </div>
                            <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                                <Activity className="h-5 w-5" />
                            </div>
                        </div>
                        <div className="mt-4 w-full bg-emerald-100 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-emerald-500 h-full rounded-full transition-all duration-1000" style={{ width: `${kpis.utilizationRate}%` }} />
                        </div>
                        <p className="text-xs text-emerald-700/80 mt-1">Material asignado en vehículos</p>
                    </div>

                    {/* Breakage Card */}
                    <div className="rounded-xl border border-red-100 bg-gradient-to-br from-red-50 to-white p-6 shadow-sm">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium text-red-600 mb-1">Tasa de Rotura</p>
                                <h4 className="text-2xl font-bold text-red-900">
                                    {kpis.breakageRate.toFixed(1)}%
                                </h4>
                            </div>
                            <div className="p-2 bg-red-100 rounded-lg text-red-600">
                                <AlertTriangle className="h-5 w-5" />
                            </div>
                        </div>
                        <div className="mt-4 flex items-center text-xs text-red-700/80">
                            {kpis.breakageRate > 5 ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
                            <span className="font-medium">{kpis.breakageRate > 5 ? 'Atención requerida' : 'Nivel aceptable'}</span>
                        </div>
                    </div>

                    {/* Fleet Efficiency */}
                    <div className="rounded-xl border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-6 shadow-sm">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium text-amber-600 mb-1">Eficiencia de Flota</p>
                                <h4 className="text-2xl font-bold text-amber-900">
                                    {(vehicles.filter(v => v.status === 'active').length / vehicles.length * 100 || 0).toFixed(0)}%
                                </h4>
                            </div>
                            <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
                                <Percent className="h-5 w-5" />
                            </div>
                        </div>
                        <p className="text-xs text-amber-700/80 mt-4">Vehículos operativos vs total</p>
                    </div>
                </div>
            </div>

            {/* Broken Items Alert Section */}
            {inventory.some(i => (i.locations || []).some(l => l.status === 'broken')) && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-6 animate-in fade-in slide-in-from-top-4">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-red-100 rounded-full text-red-600">
                            <AlertTriangle className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-red-900">Alertas de Material Roto</h3>
                            <p className="text-sm text-red-700">El siguiente material está marcado como roto y requiere reemplazo.</p>
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {inventory.flatMap(item =>
                            (item.locations || [])
                                .map((loc, idx) => ({ item, loc, idx }))
                                .filter(({ loc }) => loc.status === 'broken')
                        ).map(({ item, loc, idx }) => {
                            let locationName = 'Desconocido';
                            if (loc.type === 'vehicle') {
                                const v = vehicles.find(v => v.id === loc.id);
                                locationName = v ? `🚗 ${v.brand} ${v.model} (${v.plate})` : 'Vehículo no encontrado';
                            } else if (loc.type === 'warehouse') {
                                const w = warehouses.find(w => w.id === loc.id);
                                locationName = w ? `🏭 ${w.name}` : 'Almacén no encontrado';
                            }

                            return (
                                <div key={`${item.id}-${idx}`} className="bg-white p-4 rounded-lg border border-red-100 shadow-sm flex flex-col justify-between gap-3">
                                    <div>
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-semibold text-red-900">{item.name}</h4>
                                            <span className="text-xs font-mono bg-red-100 text-red-700 px-2 py-1 rounded">{item.sku}</span>
                                        </div>
                                        <p className="text-sm text-red-600 mt-1">{locationName}</p>
                                    </div>
                                    <button
                                        onClick={() => handleResolveBroken(item, idx)}
                                        className="text-xs w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded font-medium transition-colors"
                                    >
                                        Marcar como Reemplazado
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Main Content Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column: Operations (2/3) */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Active Incidents */}
                    <div className="rounded-xl border border-border bg-card shadow-sm">
                        <div className="p-6 border-b border-border flex items-center justify-between">
                            <h3 className="font-semibold">Incidencias Activas</h3>
                        </div>
                        <div className="p-0">
                            {incidents.filter(inc => inc.status !== 'resolved').length > 0 ? (
                                <div className="divide-y divide-border">
                                    {incidents.filter(inc => inc.status !== 'resolved').slice(0, 5).map((inc) => {
                                        const affectedVehicle = vehicles.find(v => v.id === inc.vehicleId);
                                        return (
                                            <div key={inc.id} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                                                <div className="flex items-center gap-4">
                                                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${inc.priority === 'high' ? 'bg-red-100 text-red-600' :
                                                        inc.priority === 'medium' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
                                                        }`}>
                                                        <AlertTriangle className="h-4 w-4" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium">{inc.title}</p>
                                                        {affectedVehicle && (
                                                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                                                <Car className="h-3 w-3" />
                                                                {affectedVehicle.brand} {affectedVehicle.model} ({affectedVehicle.plate})
                                                            </p>
                                                        )}
                                                        <p className="text-xs text-muted-foreground">{inc.status}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="text-xs font-medium px-2 py-1 rounded-full bg-secondary">
                                                        {inc.priority}
                                                    </div>
                                                    {inc.status !== 'resolved' && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setIncidentToResolve(inc);
                                                                setIsResolveModalOpen(true);
                                                            }}
                                                            className="p-2 hover:bg-green-100 rounded-full transition-colors group"
                                                            title="Marcar como resuelta"
                                                        >
                                                            <Check className="h-4 w-4 text-muted-foreground group-hover:text-green-600" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <AlertTriangle className="h-8 w-8 text-muted-foreground mb-3" />
                                    <p className="text-muted-foreground">No hay incidencias pendientes</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Active Fleet */}
                    <div className="rounded-xl border border-border bg-card shadow-sm">
                        <div className="p-6 border-b border-border">
                            <h3 className="font-semibold">Flota Activa</h3>
                        </div>
                        <div className="p-6">
                            <div className="space-y-4">
                                {vehicles.length > 0 ? vehicles.map((car) => (
                                    <div key={car.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className={`h-2 w-2 rounded-full animate-pulse ${car.status === 'active' ? 'bg-emerald-500' :
                                                car.status === 'maintenance' ? 'bg-red-500' : 'bg-amber-500'
                                                }`} />
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium">{car.brand} {car.model}</span>
                                                <span className="text-[10px] text-muted-foreground">{car.plate} • {car.odometer ? `${car.odometer.toLocaleString()} km` : '0 km'}</span>
                                                {car.assignedDriverId && (() => {
                                                    const driver = users.find(u => u.id === car.assignedDriverId);
                                                    return driver ? (
                                                        <span className="text-[10px] text-indigo-600 flex items-center gap-1 mt-0.5">
                                                            <Users className="w-3 h-3" />
                                                            {driver.name}
                                                        </span>
                                                    ) : null;
                                                })()}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleOpenReportIncident(car);
                                                }}
                                                className="p-1.5 hover:bg-red-100 rounded-full transition-colors group"
                                                title="Reportar incidencia"
                                            >
                                                <AlertTriangle className="h-4 w-4 text-muted-foreground group-hover:text-red-600" />
                                            </button>
                                            <div className="relative">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setShowStatusMenu(showStatusMenu === car.id ? null : car.id || null);
                                                    }}
                                                    className="text-xs font-medium px-2 py-1 rounded hover:bg-muted-foreground/10 transition-colors"
                                                >
                                                    {car.status}
                                                </button>
                                                {showStatusMenu === car.id && (
                                                    <div className="absolute right-0 mt-1 w-40 bg-card border border-border rounded-lg shadow-lg z-10">
                                                        {(['active', 'maintenance', 'rented', 'retired'] as const).map((status) => (
                                                            <button
                                                                key={status}
                                                                onClick={() => {
                                                                    setVehicleToUpdate(car);
                                                                    setNewStatus(status);
                                                                    setIsStatusChangeModalOpen(true);
                                                                    setShowStatusMenu(null);
                                                                }}
                                                                className="w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors first:rounded-t-lg last:rounded-b-lg"
                                                            >
                                                                {status}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="text-center py-4 text-muted-foreground text-sm">
                                        Sin datos de flota
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Executive Charts (1/3) */}
                <div className="space-y-6">

                    {/* Status Chart */}
                    <div className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col items-center">
                        <h3 className="font-semibold mb-4 text-center">Estado de la Flota</h3>
                        <div className="w-full max-w-[200px]">
                            <Doughnut
                                data={{
                                    labels: ['Activos', 'Mantenimiento', 'Alquilados', 'Retirados'],
                                    datasets: [{
                                        data: [
                                            vehicles.filter(v => v.status === 'active').length,
                                            vehicles.filter(v => v.status === 'maintenance').length,
                                            vehicles.filter(v => v.status === 'rented').length,
                                            vehicles.filter(v => v.status === 'retired').length
                                        ],
                                        backgroundColor: ['#10b981', '#ef4444', '#f59e0b', '#9ca3af'],
                                        borderColor: ['#047857', '#b91c1c', '#b45309', '#4b5563'],
                                        borderWidth: 1
                                    }]
                                }}
                                options={{ plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 15 } } } }}
                            />
                        </div>
                    </div>

                    {/* Incident Priority Chart */}
                    <div className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col items-center">
                        <h3 className="font-semibold mb-4 text-center">Prioridad Incidencias</h3>
                        <div className="w-full max-w-[200px]">
                            <Pie
                                data={{
                                    labels: ['Alta', 'Media', 'Baja'],
                                    datasets: [{
                                        data: [
                                            incidents.filter(i => i.priority === 'high').length,
                                            incidents.filter(i => i.priority === 'medium').length,
                                            incidents.filter(i => i.priority === 'low').length
                                        ],
                                        backgroundColor: ['#ef4444', '#f59e0b', '#3b82f6'],
                                        borderWidth: 0
                                    }]
                                }}
                                options={{ plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 15 } } } }}
                            />
                        </div>
                    </div>

                    {/* Inventory Category Chart */}
                    <div className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col items-center">
                        <h3 className="font-semibold mb-4 text-center">Inventario</h3>
                        <div className="w-full">
                            <Bar
                                data={{
                                    labels: ['Son.', 'Ilum.', 'Instr.', 'Cabl.', 'Otro'],
                                    datasets: [{
                                        label: 'Items',
                                        data: [
                                            inventory.filter(i => i.category === 'sound').length,
                                            inventory.filter(i => i.category === 'lighting').length,
                                            inventory.filter(i => i.category === 'instruments').length,
                                            inventory.filter(i => i.category === 'cables').length,
                                            inventory.filter(i => i.category === 'misc').length
                                        ],
                                        backgroundColor: '#8b5cf6',
                                        borderRadius: 4
                                    }]
                                }}
                                options={{
                                    plugins: { legend: { display: false } },
                                    scales: {
                                        y: { beginAtZero: true, grid: { color: '#333' } },
                                        x: { grid: { display: false } }
                                    }
                                }}
                            />
                        </div>
                    </div>
                </div>

            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={stats.find(s => s.id === selectedStat)?.label || 'Detalles'}
                className="max-h-[600px]"
            >
                {renderModalContent()}
            </Modal>

            <Modal
                isOpen={isResolveConfirmOpen}
                onClose={() => setIsResolveConfirmOpen(false)}
                title="Confirmar Reemplazo"
                className="max-w-sm"
            >
                <div className="space-y-4">
                    <div className="flex items-center gap-4 bg-red-50 p-4 rounded-lg text-red-800">
                        <AlertTriangle className="h-6 w-6" />
                        <p className="text-sm font-medium">Resolviendo incidencia</p>
                    </div>
                    <p className="text-gray-600 text-sm">
                        ¿Confirmas que este item ha sido <strong>reemplazado o descartado</strong>?
                        <span className="block mt-2 text-xs bg-gray-100 p-2 rounded">
                            Esta acción eliminará el item de la lista de rotos y actualizará el stock total del inventario.
                        </span>
                    </p>
                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            onClick={() => setIsResolveConfirmOpen(false)}
                            className="px-4 py-2 rounded-lg bg-gray-100 font-medium hover:bg-gray-200 text-gray-700 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={confirmResolution}
                            className="px-4 py-2 rounded-lg bg-red-600 font-medium hover:bg-red-700 text-white transition-colors"
                        >
                            Confirmar Reemplazo
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Resolve Incident Confirmation Modal */}
            <Modal
                isOpen={isResolveModalOpen}
                onClose={() => {
                    setIsResolveModalOpen(false);
                    setIncidentToResolve(null);
                }}
                title="Confirmar Resolución"
                className="max-w-sm"
            >
                <div className="space-y-4">
                    <div className="flex items-center gap-4 bg-green-50 p-4 rounded-lg text-green-800">
                        <Check className="h-6 w-6" />
                        <p className="text-sm font-medium">Marcar incidencia como resuelta</p>
                    </div>
                    {incidentToResolve && (
                        <div className="bg-muted/50 p-3 rounded-lg space-y-1">
                            <p className="text-sm font-medium">{incidentToResolve.title}</p>
                            <p className="text-xs text-muted-foreground">Prioridad: {incidentToResolve.priority}</p>
                            {(() => {
                                const affectedVehicle = vehicles.find(v => v.id === incidentToResolve.vehicleId);
                                return affectedVehicle ? (
                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Car className="h-3 w-3" />
                                        Vehículo: {affectedVehicle.brand} {affectedVehicle.model} ({affectedVehicle.plate})
                                    </p>
                                ) : null;
                            })()}
                        </div>
                    )}
                    <p className="text-gray-600 text-sm">
                        ¿Confirmas que esta incidencia ha sido <strong>resuelta</strong>?
                    </p>
                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            onClick={() => {
                                setIsResolveModalOpen(false);
                                setIncidentToResolve(null);
                            }}
                            className="px-4 py-2 rounded-lg bg-gray-100 font-medium hover:bg-gray-200 text-gray-700 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleResolveIncident}
                            className="px-4 py-2 rounded-lg bg-green-600 font-medium hover:bg-green-700 text-white transition-colors"
                        >
                            Confirmar Resolución
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Vehicle Status Change Confirmation Modal */}
            <Modal
                isOpen={isStatusChangeModalOpen}
                onClose={() => {
                    setIsStatusChangeModalOpen(false);
                    setVehicleToUpdate(null);
                    setNewStatus(null);
                }}
                title="Confirmar Cambio de Estado"
                className="max-w-sm"
            >
                <div className="space-y-4">
                    <div className="flex items-center gap-4 bg-blue-50 p-4 rounded-lg text-blue-800">
                        <Car className="h-6 w-6" />
                        <p className="text-sm font-medium">Cambiar estado del vehículo</p>
                    </div>
                    {vehicleToUpdate && newStatus && (
                        <div className="bg-muted/50 p-3 rounded-lg space-y-2">
                            <p className="text-sm font-medium">{vehicleToUpdate.brand} {vehicleToUpdate.model}</p>
                            <p className="text-xs text-muted-foreground">{vehicleToUpdate.plate}</p>
                            <div className="flex items-center gap-2 text-xs pt-2">
                                <span className="px-2 py-1 rounded bg-muted">{vehicleToUpdate.status}</span>
                                <span>→</span>
                                <span className="px-2 py-1 rounded bg-primary text-primary-foreground">{newStatus}</span>
                            </div>
                        </div>
                    )}
                    <p className="text-gray-600 text-sm">
                        ¿Confirmas el cambio de estado de este vehículo?
                    </p>
                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            onClick={() => {
                                setIsStatusChangeModalOpen(false);
                                setVehicleToUpdate(null);
                                setNewStatus(null);
                            }}
                            className="px-4 py-2 rounded-lg bg-gray-100 font-medium hover:bg-gray-200 text-gray-700 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleVehicleStatusChange}
                            className="px-4 py-2 rounded-lg bg-blue-600 font-medium hover:bg-blue-700 text-white transition-colors"
                        >
                            Confirmar Cambio
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Report Incident Modal */}
            <Modal
                isOpen={isReportIncidentModalOpen}
                onClose={() => {
                    setIsReportIncidentModalOpen(false);
                    setVehicleForIncident(null);
                }}
                title="Reportar Incidencia"
                className="max-w-md"
            >
                <form onSubmit={handleSubmitIncident} className="space-y-4">
                    {vehicleForIncident && (
                        <div className="bg-muted/50 p-3 rounded-lg">
                            <p className="text-sm font-medium flex items-center gap-2">
                                <Car className="h-4 w-4" />
                                {vehicleForIncident.brand} {vehicleForIncident.model}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">{vehicleForIncident.plate}</p>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Título</label>
                        <input
                            required
                            value={incidentFormData.title}
                            onChange={e => setIncidentFormData({ ...incidentFormData, title: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                            placeholder="Ej: Fallo de frenos"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Descripción</label>
                        <textarea
                            rows={3}
                            required
                            value={incidentFormData.description}
                            onChange={e => setIncidentFormData({ ...incidentFormData, description: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none resize-none"
                            placeholder="Describe el problema..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Prioridad</label>
                            <select
                                value={incidentFormData.priority}
                                onChange={e => setIncidentFormData({ ...incidentFormData, priority: e.target.value as any })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                            >
                                <option value="low">Baja</option>
                                <option value="medium">Media</option>
                                <option value="high">Alta</option>
                                <option value="critical">Crítica</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Reportado por</label>
                            <select
                                value={incidentFormData.reportedByUserId}
                                onChange={e => setIncidentFormData({ ...incidentFormData, reportedByUserId: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                required
                            >
                                <option value="">Seleccionar</option>
                                {users.map(u => (
                                    <option key={u.id} value={u.id}>
                                        {u.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={() => {
                                setIsReportIncidentModalOpen(false);
                                setVehicleForIncident(null);
                            }}
                            className="px-4 py-2 rounded-lg bg-gray-100 font-medium hover:bg-gray-200 text-gray-700 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 rounded-lg bg-red-600 font-medium hover:bg-red-700 text-white transition-colors"
                        >
                            Reportar Incidencia
                        </button>
                    </div>
                </form>
            </Modal>
        </div >
    );
}
