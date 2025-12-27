'use client';

import { useState, useEffect } from 'react';
import {
    Plus,
    MoreVertical,
    Edit,
    Trash2,
    Car,
    Fuel,
    Music
} from 'lucide-react';
import { DataTable, Column } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { IncidentDetailsModal } from '@/components/admin/incidents/IncidentDetailsModal';
import { addItem, updateItem, deleteItem, subscribeToCollection, addVehicleTaxonomy, getInventory, getUsers } from '@/services/FirebaseService';
import { Vehicle, VehicleMake, Incident, InventoryItem, Workshop, VehicleBrand, RentingCompany, User, VEHICLE_STATUS_LABELS, FUEL_TYPE_LABELS, TRANSMISSION_LABELS, INCIDENT_PRIORITY_LABELS, INCIDENT_STATUS_LABELS } from '@/types';
import { Timestamp } from 'firebase/firestore';
import { formatLicensePlate, getFuelLevelLabel } from '@/lib/utils';
import { AlertTriangle, ShieldAlert, MapPin } from 'lucide-react';

export default function VehiclesPage() {
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [makes, setMakes] = useState<VehicleMake[]>([]);
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [workshops, setWorkshops] = useState<Workshop[]>([]);
    const [brands, setBrands] = useState<VehicleBrand[]>([]);
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [rentingCompanies, setRentingCompanies] = useState<RentingCompany[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

    // Detail View State
    const [viewingVehicle, setViewingVehicle] = useState<Vehicle | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    // Incident View State
    const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
    const [viewingIncident, setViewingIncident] = useState<Incident | null>(null);

    // Form State
    const [formData, setFormData] = useState<Partial<Vehicle>>({
        brand: '',
        model: '',
        plate: '',
        status: 'active',
        odometer: 0,
        year: new Date().getFullYear(),
        fuelType: 'diesel',
        transmission: 'manual',
        isManagement: false,
        requiresParkingSpot: false
    });

    useEffect(() => {
        const unsubscribeVehicles = subscribeToCollection<Vehicle>('vehicles', (data) => {
            setVehicles(data);
            setLoading(false);
        });

        const unsubscribeMakes = subscribeToCollection<VehicleMake>('vehicle_makes', (data) => {
            // Sort makes alphabetically
            const sorted = data.sort((a, b) => a.name.localeCompare(b.name));
            setMakes(sorted);
        });

        const unsubscribeIncidents = subscribeToCollection<Incident>('incidents', (data) => {
            setIncidents(data);
        });

        const unsubscribeInventory = subscribeToCollection<InventoryItem>('inventory', (data) => {
            setInventory(data);
        });

        const unsubscribeWorkshops = subscribeToCollection<Workshop>('workshops', (data) => {
            setWorkshops(data);
        });

        const unsubscribeBrands = subscribeToCollection<VehicleBrand>('brands', (data) => {
            const sorted = data.sort((a, b) => a.name.localeCompare(b.name));
            setBrands(sorted);
        });

        const unsubscribeWarehouses = subscribeToCollection<any>('warehouses', (data) => {
            setWarehouses(data);
        });

        const unsubscribeRenting = subscribeToCollection<RentingCompany>('renting_companies', (data) => {
            setRentingCompanies(data);
        });

        const unsubscribeUsers = subscribeToCollection<User>('users', (data) => {
            setUsers(data);
        });

        return () => {
            unsubscribeVehicles();
            unsubscribeMakes();
            unsubscribeIncidents();
            unsubscribeInventory();
            unsubscribeWorkshops();
            unsubscribeBrands();
            unsubscribeBrands();
            unsubscribeWarehouses();
            unsubscribeRenting();
            unsubscribeUsers();
        };
    }, []);

    const handleOpenModal = (vehicle?: Vehicle) => {
        if (vehicle) {
            setEditingVehicle(vehicle);
            setFormData(vehicle);
        } else {
            setEditingVehicle(null);
            setFormData({
                brand: '',
                model: '',
                plate: '',
                status: 'active',
                odometer: 0,
                year: new Date().getFullYear(),
                fuelType: 'diesel',
                transmission: 'manual',
                isManagement: false,
                requiresParkingSpot: false
            });
        }
        setIsModalOpen(true);
    };

    // Delete Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [vehicleToDelete, setVehicleToDelete] = useState<string | null>(null);

    const confirmDelete = (id: string) => {
        setVehicleToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const handleDeleteKey = async () => {
        if (vehicleToDelete) {
            await deleteItem('vehicles', vehicleToDelete);
            setIsDeleteModalOpen(false);
            setVehicleToDelete(null);
        }
    };

    const handleViewIncident = (incident: Incident) => {
        setViewingIncident(incident);
        setIsIncidentModalOpen(true);
    };

    // Broken Report Modal State
    const [isBrokenConfirmOpen, setIsBrokenConfirmOpen] = useState(false);
    const [itemToBreak, setItemToBreak] = useState<{ item: InventoryItem, vehicleId: string } | null>(null);

    const handleReportBroken = (item: InventoryItem, vehicleId: string) => {
        setItemToBreak({ item, vehicleId });
        setIsBrokenConfirmOpen(true);
    };

    const confirmBreakage = async () => {
        if (!itemToBreak) return;
        const { item, vehicleId } = itemToBreak;

        try {
            const locations = item.locations || [];
            const locIndex = locations.findIndex(l => l.type === 'vehicle' && l.id === vehicleId && (!l.status || l.status === 'new' || l.status === 'working_urgent_change' || (l.status as any) === 'ok'));

            if (locIndex === -1) return;

            const loc = locations[locIndex];
            const updatedLocs = [...locations];

            if (loc.quantity > 1) {
                updatedLocs[locIndex] = { ...loc, quantity: loc.quantity - 1 };
                updatedLocs.push({ ...loc, quantity: 1, status: 'totally_broken' });
            } else {
                updatedLocs[locIndex] = { ...loc, status: 'totally_broken' };
            }

            if (item.id) {
                await updateItem('inventory', item.id, { locations: updatedLocs });
            }
            setIsBrokenConfirmOpen(false);
            setItemToBreak(null);
        } catch (error) {
            console.error('Error reporting broken item:', error);
            alert('Error al reportar');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const dataToSave = { ...formData };

            // Smart Taxonomy Learning (Fire and Forget)
            if (formData.brand && formData.model) {
                addVehicleTaxonomy(formData.brand, formData.model);
            }

            // Clean up dates if empty
            if (!formData.contractStartDate) delete (dataToSave as any).contractStartDate;
            if (!formData.contractEndDate) delete (dataToSave as any).contractEndDate;
            if (!formData.rentingCompanyId) {
                delete (dataToSave as any).rentingCompanyId;
                delete (dataToSave as any).contractStartDate;
                delete (dataToSave as any).contractEndDate;
            }

            if (editingVehicle && editingVehicle.id) {
                await updateItem('vehicles', editingVehicle.id, dataToSave);
            } else {
                await addItem('vehicles', dataToSave);
            }
            setIsModalOpen(false);
        } catch (error) {
            console.error('Error saving vehicle:', error);
            alert('Error al guardar el vehículo');
        }
    };

    const columns: Column<Vehicle>[] = [
        {
            key: 'image',
            label: 'Imagen',
            render: (v) => (
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                    {v.image ? (
                        <img src={v.image} alt={v.model} className="h-full w-full object-cover" />
                    ) : (
                        <Car className="h-5 w-5 text-muted-foreground" />
                    )}
                </div>
            )
        },
        { key: 'brand', label: 'Marca', sortable: true },
        { key: 'model', label: 'Modelo', sortable: true },
        {
            key: 'plate',
            label: 'Matrícula',
            render: (v) => <span className="font-mono bg-muted px-2 py-1 rounded text-xs">{formatLicensePlate(v.plate)}</span>,
            sortable: true
        },
        {
            key: 'status',
            label: 'Estado',
            render: (v) => (
                <StatusBadge
                    status={v.status}
                    options={[
                        { label: VEHICLE_STATUS_LABELS.active, value: 'active' },
                        { label: VEHICLE_STATUS_LABELS.maintenance, value: 'maintenance' },
                        { label: VEHICLE_STATUS_LABELS.rented, value: 'rented' },
                        { label: VEHICLE_STATUS_LABELS.retired, value: 'retired' }
                    ]}
                    onChange={(newStatus) => {
                        if (v.id) {
                            updateItem('vehicles', v.id, { status: newStatus as any });
                        }
                    }}
                />
            ),
            sortable: true
        },
        { key: 'odometer', label: 'Odómetro', render: (v) => `${v.odometer.toLocaleString()} km`, sortable: true },
        {
            key: 'warehouseId' as keyof Vehicle,
            label: 'Sede',
            render: (v) => {
                const warehouse = warehouses.find(w => w.id === v.warehouseId);
                return (
                    <span className="text-xs font-medium text-muted-foreground">
                        {warehouse ? warehouse.name : '-'}
                    </span>
                );
            }
        },
        {
            key: 'flags' as keyof Vehicle,
            label: 'Flags',
            render: (v) => (
                <div className="flex gap-1">
                    {v.isManagement && (
                        <div className="p-1 rounded bg-purple-100 text-purple-700" title="Vehículo de Gerencia">
                            <ShieldAlert className="w-4 h-4" />
                        </div>
                    )}
                    {v.requiresParkingSpot && (
                        <div className="p-1 rounded bg-blue-100 text-blue-700" title="Requiere Parking">
                            <MapPin className="w-4 h-4" />
                        </div>
                    )}
                </div>
            )
        },
        {
            key: 'actions',
            label: 'Acciones',
            render: (v) => (
                <div className="flex items-center gap-2">
                    <button
                        onClick={(e) => { e.stopPropagation(); handleOpenModal(v); }}
                        className="p-2 hover:bg-muted rounded-full transition-colors"
                        title="Editar"
                    >
                        <Edit className="h-4 w-4 text-gray-500" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); if (v.id) confirmDelete(v.id); }}
                        className="p-2 hover:bg-red-50 rounded-full transition-colors"
                        title="Eliminar"
                    >
                        <Trash2 className="h-4 w-4 text-red-500" />
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className="p-8 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Vehículos</h1>
                    <p className="text-muted-foreground mt-2">Gestiona la flota de vehículos activos, en mantenimiento y rentados.</p>
                </div>
            </div>

            <DataTable
                columns={columns}
                data={vehicles}
                isLoading={loading}
                title="Flota Actual"
                searchPlaceholder="Buscar por matrícula, marca..."
                breakpoint="2xl"
                onRowClick={(vehicle) => {
                    setViewingVehicle(vehicle);
                    setIsDetailModalOpen(true);
                }}
                mobileItem={(vehicle) => (
                    <div className="bg-card p-4 rounded-xl border border-border shadow-sm space-y-4">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                                    {vehicle.image ? (
                                        <img src={vehicle.image} alt={vehicle.model} className="h-full w-full object-cover" />
                                    ) : (
                                        <Car className="h-6 w-6 text-muted-foreground" />
                                    )}
                                </div>
                                <div>
                                    <div className="flex flex-col">
                                        <h3 className="font-semibold text-foreground line-clamp-1">{vehicle.brand} {vehicle.model}</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="font-mono bg-muted/50 px-1.5 py-0.5 rounded text-xs text-foreground font-medium border border-border/50">
                                                {formatLicensePlate(vehicle.plate)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <StatusBadge
                                status={vehicle.status}
                                options={[
                                    { label: VEHICLE_STATUS_LABELS.active, value: 'active' },
                                    { label: VEHICLE_STATUS_LABELS.maintenance, value: 'maintenance' },
                                    { label: VEHICLE_STATUS_LABELS.rented, value: 'rented' },
                                    { label: VEHICLE_STATUS_LABELS.retired, value: 'retired' }
                                ]}
                                onChange={(newStatus) => {
                                    if (vehicle.id) {
                                        updateItem('vehicles', vehicle.id, { status: newStatus as any });
                                    }
                                }}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3 py-3 border-b border-border/50">
                            <div className="space-y-1">
                                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Odómetro</span>
                                <p className="text-sm font-medium">{vehicle.odometer.toLocaleString()} km</p>
                            </div>
                            <div className="space-y-1">
                                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Combustible</span>
                                <p className="text-sm font-medium truncate">
                                    {getFuelLevelLabel(vehicle.fuelLevel)}
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3 pb-3 border-b border-border/50">
                            <div className="space-y-1">
                                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Sede</span>
                                <p className="text-sm font-medium truncate">
                                    {warehouses.find(w => w.id === vehicle.warehouseId)?.name || '-'}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                            <div className="flex gap-1">
                                {vehicle.isManagement && (
                                    <div className="p-1.5 rounded-md bg-purple-50 text-purple-700 border border-purple-100 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800" title="Vehículo de Gerencia">
                                        <ShieldAlert className="w-3.5 h-3.5" />
                                    </div>
                                )}
                                {vehicle.requiresParkingSpot && (
                                    <div className="p-1.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800" title="Requiere Parking">
                                        <MapPin className="w-3.5 h-3.5" />
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-1">
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleOpenModal(vehicle); }}
                                    className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                                    title="Editar"
                                >
                                    <Edit className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); if (vehicle.id) confirmDelete(vehicle.id); }}
                                    className="p-2 hover:bg-red-50 hover:text-red-600 rounded-lg text-muted-foreground transition-colors dark:hover:bg-red-900/20"
                                    title="Eliminar"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                )
                }
                actionButton={
                    < button
                        onClick={() => handleOpenModal()}
                        className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Nuevo Vehículo
                    </button >
                }
            />

            < Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingVehicle ? 'Editar Vehículo' : 'Nuevo Vehículo'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Marca</label>
                            <select
                                required
                                value={formData.brandId}
                                onChange={e => {
                                    const selectedId = e.target.value;
                                    const selectedBrand = brands.find(b => b.id === selectedId);
                                    setFormData({
                                        ...formData,
                                        brandId: selectedId,
                                        brand: selectedBrand ? selectedBrand.name : ''
                                    });
                                }}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                            >
                                <option value="">Seleccionar marca</option>
                                {brands.map(brand => (
                                    <option key={brand.id} value={brand.id}>
                                        {brand.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Modelo</label>
                            <input
                                list="models-list"
                                required
                                value={formData.model}
                                onChange={e => setFormData({ ...formData, model: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                placeholder="Corolla"
                            />
                            <datalist id="models-list">
                                {makes
                                    .find(m => m.name.toLowerCase() === (formData.brand || '').toLowerCase())
                                    ?.models.sort()
                                    .map(model => (
                                        <option key={model} value={model} />
                                    ))
                                }
                            </datalist>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Matrícula</label>
                            <input
                                required
                                value={formData.plate}
                                onChange={e => setFormData({ ...formData, plate: formatLicensePlate(e.target.value) })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                placeholder="1234 ABC"
                                maxLength={8}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Año</label>
                            <input
                                type="number"
                                value={formData.year || ''}
                                onChange={e => setFormData({ ...formData, year: parseInt(e.target.value) || new Date().getFullYear() })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Combustible</label>
                            <select
                                value={formData.fuelType}
                                onChange={e => setFormData({ ...formData, fuelType: e.target.value as any })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                            >
                                <option value="diesel">{FUEL_TYPE_LABELS.diesel}</option>
                                <option value="gasoline">{FUEL_TYPE_LABELS.gasoline}</option>
                                <option value="electric">{FUEL_TYPE_LABELS.electric}</option>
                                <option value="hybrid">{FUEL_TYPE_LABELS.hybrid}</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Transmisión</label>
                            <select
                                value={formData.transmission}
                                onChange={e => setFormData({ ...formData, transmission: e.target.value as any })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                            >
                                <option value="manual">{TRANSMISSION_LABELS.manual}</option>
                                <option value="automatic">{TRANSMISSION_LABELS.automatic}</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Estado</label>
                            <select
                                value={formData.status}
                                onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                            >
                                <option value="active">{VEHICLE_STATUS_LABELS.active}</option>
                                <option value="maintenance">{VEHICLE_STATUS_LABELS.maintenance}</option>
                                <option value="rented">{VEHICLE_STATUS_LABELS.rented}</option>
                                <option value="retired">{VEHICLE_STATUS_LABELS.retired}</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Odómetro (km)</label>
                            <input
                                type="number"
                                value={formData.odometer || ''}
                                onChange={e => setFormData({ ...formData, odometer: parseInt(e.target.value) || 0 })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Taller Asignado</label>
                        <select
                            value={formData.workshopId || ''}
                            onChange={e => setFormData({ ...formData, workshopId: e.target.value || undefined })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                        >
                            <option value="">Sin taller asignado</option>
                            {workshops.map(w => (
                                <option key={w.id} value={w.id}>
                                    {w.name} ({w.brand})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="pt-4 border-t border-border">
                        <h3 className="text-sm font-bold mb-3 text-muted-foreground uppercase tracking-wider">Datos de Renting</h3>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Empresa de Renting</label>
                                <select
                                    value={formData.rentingCompanyId || ''}
                                    onChange={e => setFormData({ ...formData, rentingCompanyId: e.target.value || undefined })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                >
                                    <option value="">Ninguna - Vehículo en Propiedad</option>
                                    {rentingCompanies.map(rc => (
                                        <option key={rc.id} value={rc.id}>
                                            {rc.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {formData.rentingCompanyId && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Inicio Contrato</label>
                                        <input
                                            type="date"
                                            value={formData.contractStartDate || ''}
                                            onChange={e => setFormData({ ...formData, contractStartDate: e.target.value })}
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Fin Contrato</label>
                                        <input
                                            type="date"
                                            value={formData.contractEndDate || ''}
                                            onChange={e => setFormData({ ...formData, contractEndDate: e.target.value })}
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <ImageUpload
                            value={formData.image}
                            onChange={(url) => setFormData({ ...formData, image: url })}
                            label="Foto del Vehículo"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Sede Asignada (Tanatorio)</label>
                        <select
                            value={formData.warehouseId || ''}
                            onChange={e => setFormData({ ...formData, warehouseId: e.target.value || undefined })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                        >
                            <option value="">Sin sede asignada</option>
                            {warehouses.map(w => (
                                <option key={w.id} value={w.id}>
                                    {w.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
                        <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
                            <input
                                type="checkbox"
                                id="isManagement"
                                checked={formData.isManagement || false}
                                onChange={e => setFormData({ ...formData, isManagement: e.target.checked })}
                                className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <div className="flex flex-col">
                                <label htmlFor="isManagement" className="text-sm font-medium text-foreground cursor-pointer">
                                    Vehículo de Gerencia
                                </label>
                                <span className="text-xs text-muted-foreground">
                                    Oculto para conductores regulares
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
                            <input
                                type="checkbox"
                                id="requiresParkingSpot"
                                checked={formData.requiresParkingSpot || false}
                                onChange={e => setFormData({ ...formData, requiresParkingSpot: e.target.checked })}
                                className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <div className="flex flex-col">
                                <label htmlFor="requiresParkingSpot" className="text-sm font-medium text-foreground cursor-pointer">
                                    Requiere Parking
                                </label>
                                <span className="text-xs text-muted-foreground">
                                    Exige ubicación al devolverlo
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="px-4 py-2 rounded-lg bg-muted text-foreground font-medium hover:bg-muted/80 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
                        >
                            {editingVehicle ? 'Guardar Cambios' : 'Crear Vehículo'}
                        </button>
                    </div>
                </form>
            </Modal >

            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Confirmar Eliminación"
                className="max-w-sm"
            >
                <div className="space-y-4">
                    <div className="flex items-center gap-4 bg-red-50 p-4 rounded-lg text-red-800">
                        <Trash2 className="h-6 w-6" />
                        <p className="text-sm font-medium">Esta acción no se puede deshacer.</p>
                    </div>
                    <p className="text-gray-600">
                        ¿Estás seguro de que quieres eliminar este vehículo permanentemente de la base de datos?
                    </p>
                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            onClick={() => setIsDeleteModalOpen(false)}
                            className="px-4 py-2 rounded-lg bg-gray-100 font-medium hover:bg-gray-200 text-gray-700 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleDeleteKey}
                            className="px-4 py-2 rounded-lg bg-red-600 font-medium hover:bg-red-700 text-white transition-colors"
                        >
                            Eliminar Vehículo
                        </button>
                    </div>
                </div>
            </Modal>
            {/* Detail Modal */}
            <Modal
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                title="Ficha Técnica del Vehículo"
                className="max-w-2xl"
            >
                {viewingVehicle && (
                    <div className="space-y-6">
                        {/* Header Info */}
                        <div className="flex items-start justify-between border-b border-border pb-6">
                            <div className="flex gap-4">
                                <div className="h-20 w-20 rounded-xl bg-muted flex items-center justify-center overflow-hidden border border-border">
                                    {viewingVehicle.image ? (
                                        <img src={viewingVehicle.image} alt={viewingVehicle.model} className="h-full w-full object-cover" />
                                    ) : (
                                        <Car className="h-10 w-10 text-muted-foreground/50" />
                                    )}
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-foreground">
                                        {viewingVehicle.brand} {viewingVehicle.model}
                                    </h2>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-muted-foreground font-mono bg-muted px-2 py-0.5 rounded text-sm">
                                            {formatLicensePlate(viewingVehicle.plate)}
                                        </span>
                                        <span className="text-muted-foreground text-sm">•</span>
                                        <span className="text-muted-foreground text-sm">{viewingVehicle.year}</span>
                                    </div>
                                </div>
                            </div>
                            <StatusBadge status={viewingVehicle.status} />
                        </div>

                        {/* Specs Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                            <div className="space-y-1">
                                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Odómetro</span>
                                <p className="font-medium text-lg">{viewingVehicle.odometer?.toLocaleString()} km</p>
                            </div>

                            <div className="space-y-1">
                                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Combustible</span>
                                <p className="font-medium text-lg capitalize">
                                    {FUEL_TYPE_LABELS[viewingVehicle.fuelType] || '-'}
                                </p>
                            </div>

                            <div className="space-y-1">
                                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Transmisión</span>
                                <p className="font-medium text-lg capitalize">
                                    {TRANSMISSION_LABELS[viewingVehicle.transmission] || '-'}
                                </p>
                            </div>

                            {viewingVehicle.nextMaintenanceDate && (
                                <div className="space-y-1">
                                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Próximo Mantenimiento</span>
                                    <p className="font-medium text-lg">
                                        {/* Handle Timestamp or Date string safely */}
                                        {viewingVehicle.nextMaintenanceDate?.toDate ?
                                            viewingVehicle.nextMaintenanceDate.toDate().toLocaleDateString() :
                                            new Date(viewingVehicle.nextMaintenanceDate).toLocaleDateString() || '-'}
                                    </p>
                                </div>
                            )}



                            {viewingVehicle.warehouseId && (
                                <div className="space-y-1">
                                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Sede / Tanatorio</span>
                                    <p className="font-medium text-lg">
                                        {warehouses.find(w => w.id === viewingVehicle.warehouseId)?.name || 'Desconocida'}
                                    </p>
                                </div>
                            )}

                            <div className="space-y-3 col-span-2 md:col-span-3 pt-4 border-t border-border">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-bold text-foreground flex items-center gap-2">
                                        <Fuel className="w-4 h-4 text-primary" />
                                        Nivel de Combustible Actual
                                    </span>
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${viewingVehicle.fuelLevel === '100' ? 'bg-green-100 text-green-700' :
                                        viewingVehicle.fuelLevel === '75' ? 'bg-green-100 text-green-700' :
                                            viewingVehicle.fuelLevel === '50' ? 'bg-yellow-100 text-yellow-700' :
                                                viewingVehicle.fuelLevel === '25' ? 'bg-orange-100 text-orange-700' :
                                                    viewingVehicle.fuelLevel === '10' ? 'bg-red-100 text-red-700' :
                                                        viewingVehicle.fuelLevel === '0' ? 'bg-red-200 text-red-800 animate-pulse' :
                                                            'bg-muted text-muted-foreground'
                                        }`}>
                                        {getFuelLevelLabel(viewingVehicle.fuelLevel)}
                                    </span>
                                </div>
                                <div className="w-full bg-muted h-3 rounded-full overflow-hidden border border-border shadow-inner">
                                    <div
                                        className={`h-full transition-all duration-500 rounded-full ${viewingVehicle.fuelLevel === '100' ? 'bg-green-500 w-full' :
                                            viewingVehicle.fuelLevel === '75' ? 'bg-green-400 w-[75%]' :
                                                viewingVehicle.fuelLevel === '50' ? 'bg-yellow-400 w-[50%]' :
                                                    viewingVehicle.fuelLevel === '25' ? 'bg-orange-400 w-[25%]' :
                                                        viewingVehicle.fuelLevel === '10' ? 'bg-red-400 w-[10%]' :
                                                            viewingVehicle.fuelLevel === '0' ? 'bg-red-600 w-[5%] animate-pulse' :
                                                                'w-0'
                                            }`}
                                    ></div>
                                </div>
                                {!viewingVehicle.fuelLevel && (
                                    <p className="text-[10px] text-muted-foreground italic text-center">
                                        El nivel se actualizará automáticamente cuando un conductor lo reporte.
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Incidents Section */}
                        <div className="pt-6 border-t border-border">
                            <h3 className="text-lg font-bold mb-4">Historial de Incidencias</h3>
                            {incidents.filter(i => i.vehicleId === viewingVehicle.id).length > 0 ? (
                                <div className="space-y-3">
                                    {incidents
                                        .filter(i => i.vehicleId === viewingVehicle.id)
                                        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
                                        .map(incident => {
                                            const relatedItem = inventory.find(i => i.id === incident.inventoryItemId);
                                            const isMaterialIncident = !!incident.inventoryItemId;

                                            return (
                                                <div
                                                    key={incident.id}
                                                    className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30 cursor-pointer hover:bg-muted transition-colors"
                                                    onClick={() => handleViewIncident(incident)}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-2 rounded-lg ${isMaterialIncident ? 'bg-purple-100 text-purple-600' : 'bg-amber-100 text-amber-600'}`}>
                                                            {isMaterialIncident ? <Music className="h-4 w-4" /> : <Car className="h-4 w-4" />}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="font-medium text-sm">
                                                                {incident.title}
                                                                {isMaterialIncident && relatedItem && (
                                                                    <span className="ml-2 text-[10px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100 uppercase">
                                                                        {relatedItem.name}
                                                                    </span>
                                                                )}
                                                            </span>
                                                            <span className="text-xs text-muted-foreground">
                                                                {incident.createdAt?.toDate ?
                                                                    incident.createdAt.toDate().toLocaleDateString() :
                                                                    'Fecha desconocida'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-[10px] px-2 py-0.5 font-bold rounded-full border uppercase tracking-wider ${incident.priority === 'critical' || incident.priority === 'high' ? 'bg-red-50 text-red-700 border-red-100' :
                                                            incident.priority === 'medium' ? 'bg-yellow-50 text-yellow-700 border-yellow-100' :
                                                                'bg-green-50 text-green-700 border-green-100'
                                                            }`}>
                                                            {INCIDENT_PRIORITY_LABELS[incident.priority] || incident.priority}
                                                        </span>
                                                        <StatusBadge status={incident.status as any} />
                                                    </div>
                                                </div>
                                            );
                                        })
                                    }
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground italic">No hay incidencias registradas para este vehículo.</p>
                            )}
                        </div>

                        {/* Inventory Section */}
                        <div className="pt-6 border-t border-border">
                            <h3 className="text-lg font-bold mb-4">Inventario Asignado</h3>
                            {inventory.filter(i => (i.locations || []).some(l => l.type === 'vehicle' && l.id === viewingVehicle.id)).length > 0 ? (
                                <div className="space-y-3">
                                    {inventory
                                        .filter(i => (i.locations || []).some(l => l.type === 'vehicle' && l.id === viewingVehicle.id))
                                        .flatMap(item => {
                                            // We flatten here because one item might have 2 separate location entries for this vehicle (one ok, one broken)
                                            const vehicleLocs = (item.locations || []).filter(l => l.type === 'vehicle' && l.id === viewingVehicle.id);
                                            return vehicleLocs.map((loc, idx) => ({ item, loc, idx }));
                                        })
                                        .map(({ item, loc, idx }) => {
                                            const isBroken = loc.status === 'totally_broken';
                                            return (
                                                <div key={`${item.id}-${idx}`} className={`flex items-center justify-between p-3 rounded-lg border ${isBroken ? 'border-red-200 bg-red-50' : 'border-border bg-muted/30'}`}>
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`font-medium text-sm ${isBroken ? 'text-red-700' : ''}`}>{item.name}</span>
                                                            {isBroken && <span className="text-[10px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded border border-red-200">ROTO</span>}
                                                        </div>
                                                        <span className="text-xs text-muted-foreground font-mono">{item.sku}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-medium bg-background px-2 py-1 rounded border">
                                                            Cant: {loc.quantity}
                                                        </span>
                                                        {!isBroken && (
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    handleReportBroken(item, viewingVehicle.id!);
                                                                }}
                                                                className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                                title="Marcar como roto"
                                                            >
                                                                <AlertTriangle className="h-4 w-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    }
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground italic">No hay material asignado a este vehículo.</p>
                            )}
                        </div>

                        {/* Footer Actions */}
                        <div className="flex justify-end pt-4 border-t border-border">
                            <button
                                onClick={() => {
                                    handleOpenModal(viewingVehicle);
                                    setIsDetailModalOpen(false);
                                }}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
                            >
                                <Edit className="w-4 h-4" />
                                Editar Ficha
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            <Modal
                isOpen={isBrokenConfirmOpen}
                onClose={() => setIsBrokenConfirmOpen(false)}
                title="Confirmar Rotura"
                className="max-w-sm"
            >
                <div className="space-y-4">
                    <div className="flex items-center gap-4 bg-amber-50 p-4 rounded-lg text-amber-800">
                        <AlertTriangle className="h-6 w-6" />
                        <p className="text-sm font-medium">Marcando material como defectuoso</p>
                    </div>
                    <p className="text-gray-600 text-sm">
                        ¿Estás seguro de que quieres marcar este item como <strong>roto</strong>?
                        {itemToBreak && itemToBreak.item.quantity > 1 && (
                            <span className="block mt-2 text-xs bg-gray-100 p-2 rounded">
                                Nota: Al haber varias unidades, se separará solo una como rota y el resto permencerá disponible.
                            </span>
                        )}
                    </p>
                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            onClick={() => setIsBrokenConfirmOpen(false)}
                            className="px-4 py-2 rounded-lg bg-gray-100 font-medium hover:bg-gray-200 text-gray-700 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={confirmBreakage}
                            className="px-4 py-2 rounded-lg bg-red-600 font-medium hover:bg-red-700 text-white transition-colors"
                        >
                            Marcar como Roto
                        </button>
                    </div>
                </div>
            </Modal>

            <IncidentDetailsModal
                isOpen={isIncidentModalOpen}
                onClose={() => setIsIncidentModalOpen(false)}
                incident={viewingIncident}
                vehicles={vehicles}
                users={users}
                inventory={inventory}
            />
        </div >
    );
}
