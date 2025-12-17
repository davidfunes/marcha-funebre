'use client';

import { useState, useEffect } from 'react';
import {
    Plus,
    MoreVertical,
    Edit,
    Trash2,
    Car
} from 'lucide-react';
import { DataTable, Column } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import { addItem, updateItem, deleteItem, subscribeToCollection, addVehicleTaxonomy, getInventory } from '@/services/FirebaseService';
import { Vehicle, VehicleMake, Incident, InventoryItem, Workshop, VehicleBrand } from '@/types';
import { Timestamp } from 'firebase/firestore';
import { formatLicensePlate } from '@/lib/utils';
import { AlertTriangle, ShieldAlert, MapPin } from 'lucide-react';

export default function VehiclesPage() {
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [makes, setMakes] = useState<VehicleMake[]>([]);
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [workshops, setWorkshops] = useState<Workshop[]>([]);
    const [brands, setBrands] = useState<VehicleBrand[]>([]);
    const [warehouses, setWarehouses] = useState<any[]>([]); // Using any[] temporarily until Warehouse type is fully imported if needed, but we have it in types
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

    // Detail View State
    const [viewingVehicle, setViewingVehicle] = useState<Vehicle | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

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

        return () => {
            unsubscribeVehicles();
            unsubscribeMakes();
            unsubscribeIncidents();
            unsubscribeInventory();
            unsubscribeWorkshops();
            unsubscribeBrands();
            unsubscribeWarehouses();
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
            const locIndex = locations.findIndex(l => l.type === 'vehicle' && l.id === vehicleId && (!l.status || l.status === 'ok'));

            if (locIndex === -1) return;

            const loc = locations[locIndex];
            const updatedLocs = [...locations];

            if (loc.quantity > 1) {
                updatedLocs[locIndex] = { ...loc, quantity: loc.quantity - 1 };
                updatedLocs.push({ ...loc, quantity: 1, status: 'broken' });
            } else {
                updatedLocs[locIndex] = { ...loc, status: 'broken' };
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
                        { label: 'Active', value: 'active' },
                        { label: 'Maintenance', value: 'maintenance' },
                        { label: 'Rented', value: 'rented' },
                        { label: 'Retired', value: 'retired' }
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
                    >
                        <Edit className="h-4 w-4 text-gray-500" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); if (v.id) confirmDelete(v.id); }}
                        className="p-2 hover:bg-red-50 rounded-full transition-colors"
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
                                    { label: 'Active', value: 'active' },
                                    { label: 'Maintenance', value: 'maintenance' },
                                    { label: 'Rented', value: 'rented' },
                                    { label: 'Retired', value: 'retired' }
                                ]}
                                onChange={(newStatus) => {
                                    if (vehicle.id) {
                                        updateItem('vehicles', vehicle.id, { status: newStatus as any });
                                    }
                                }}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3 pb-3 border-b border-border/50">
                            <div className="space-y-1">
                                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Odómetro</span>
                                <p className="text-sm font-medium">{vehicle.odometer.toLocaleString()} km</p>
                            </div>
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
                                >
                                    <Edit className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); if (vehicle.id) confirmDelete(vehicle.id); }}
                                    className="p-2 hover:bg-red-50 hover:text-red-600 rounded-lg text-muted-foreground transition-colors dark:hover:bg-red-900/20"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                actionButton={
                    <button
                        onClick={() => handleOpenModal()}
                        className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Nuevo Vehículo
                    </button>
                }
            />

            <Modal
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
                                <option value="diesel">Diésel</option>
                                <option value="gasoline">Gasolina</option>
                                <option value="electric">Eléctrico</option>
                                <option value="hybrid">Híbrido</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Transmisión</label>
                            <select
                                value={formData.transmission}
                                onChange={e => setFormData({ ...formData, transmission: e.target.value as any })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                            >
                                <option value="manual">Manual</option>
                                <option value="automatic">Automática</option>
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
                                <option value="active">Activo</option>
                                <option value="maintenance">Mantenimiento</option>
                                <option value="rented">Alquilado</option>
                                <option value="retired">Retirado</option>
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

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Imagen URL (Opcional)</label>
                        <input
                            value={formData.image || ''}
                            onChange={e => setFormData({ ...formData, image: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                            placeholder="https://..."
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
            </Modal>

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
                                    {viewingVehicle.fuelType === 'electric' ? 'Eléctrico' :
                                        viewingVehicle.fuelType === 'hybrid' ? 'Híbrido' :
                                            viewingVehicle.fuelType === 'diesel' ? 'Diésel' :
                                                viewingVehicle.fuelType === 'gasoline' ? 'Gasolina' : '-'}
                                </p>
                            </div>

                            <div className="space-y-1">
                                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Transmisión</span>
                                <p className="font-medium text-lg capitalize">
                                    {viewingVehicle.transmission === 'automatic' ? 'Automática' :
                                        viewingVehicle.transmission === 'manual' ? 'Manual' : '-'}
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
                        </div>

                        {/* Incidents Section */}
                        <div className="pt-6 border-t border-border">
                            <h3 className="text-lg font-bold mb-4">Historial de Incidencias</h3>
                            {incidents.filter(i => i.vehicleId === viewingVehicle.id).length > 0 ? (
                                <div className="space-y-3">
                                    {incidents
                                        .filter(i => i.vehicleId === viewingVehicle.id)
                                        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
                                        .map(incident => (
                                            <div key={incident.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-sm">{incident.title}</span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {incident.createdAt?.toDate ?
                                                            incident.createdAt.toDate().toLocaleDateString() :
                                                            'Fecha desconocida'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-xs px-2 py-1 rounded-full border ${incident.priority === 'critical' || incident.priority === 'high' ? 'bg-red-100 text-red-700 border-red-200' :
                                                        incident.priority === 'medium' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                                                            'bg-green-100 text-green-700 border-green-200'
                                                        }`}>
                                                        {incident.priority}
                                                    </span>
                                                    <StatusBadge status={incident.status as any} />
                                                </div>
                                            </div>
                                        ))
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
                                            const isBroken = loc.status === 'broken';
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
        </div>
    );
}
