'use client';

import { useState, useEffect } from 'react';
import {
    Wrench,
    Plus,
    Edit,
    Trash2,
    Phone,
    MapPin,
    Building2,
    Car,
    Search,
    Loader2,
    ExternalLink
} from 'lucide-react';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { cn, formatPhoneNumber } from '@/lib/utils';
import { addItem, updateItem, deleteItem, subscribeToCollection, getVehicles } from '@/services/FirebaseService';
import { Workshop, Vehicle, VehicleBrand } from '@/types';
import { Timestamp } from 'firebase/firestore';

export default function WorkshopsPage() {
    const [workshops, setWorkshops] = useState<Workshop[]>([]);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [brands, setBrands] = useState<VehicleBrand[]>([]);
    const [loading, setLoading] = useState(true);

    // Delete Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [workshopToDelete, setWorkshopToDelete] = useState<string | null>(null);

    // Modal & Form
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingWorkshop, setEditingWorkshop] = useState<Workshop | null>(null);
    const [formData, setFormData] = useState<Partial<Workshop>>({
        name: '',
        brandId: '',
        address: '',
        phone: ''
    });

    // View Assigned Vehicles Modal
    const [isViewVehiclesModalOpen, setIsViewVehiclesModalOpen] = useState(false);
    const [viewingWorkshop, setViewingWorkshop] = useState<Workshop | null>(null);

    useEffect(() => {
        // Subscribe to real-time workshops
        const unsubscribe = subscribeToCollection<Workshop>('workshops', (data) => {
            setWorkshops(data);
            setLoading(false);
        });

        // Load vehicles
        const loadVehicles = async () => {
            const vData = await getVehicles();
            setVehicles(vData);
        };
        loadVehicles();

        const unsubscribeBrands = subscribeToCollection<VehicleBrand>('brands', (data) => {
            const sorted = data.sort((a, b) => a.name.localeCompare(b.name));
            setBrands(sorted);
        });

        return () => {
            unsubscribe();
            unsubscribeBrands();
        };
    }, []);

    // Address Search State
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<any[]>([]);

    const handleSearchLocation = async () => {
        // Search using the NAME entered by the user
        if (!formData.name) return;

        setIsSearching(true);
        try {
            // Using OpenStreetMap Nominatim API
            // Added extratags=1 to get phone numbers, and dedupe=0
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(formData.name)}&limit=25&addressdetails=1&extratags=1&dedupe=0`);
            const data = await response.json();
            setSearchResults(data);
            if (data.length === 0) {
                // Keep empty to show fallback in dropdown
            }
        } catch (error) {
            console.error('Error searching location:', error);
            alert('Error al buscar el taller.');
        } finally {
            setIsSearching(false);
        }
    };

    const handleOpenModal = (workshop?: Workshop) => {
        if (workshop) {
            setEditingWorkshop(workshop);
            setFormData(workshop);
        } else {
            setEditingWorkshop(null);
            setFormData({
                name: '',
                brand: '',
                address: '',
                phone: ''
            });
        }
        setIsModalOpen(true);
    };

    const confirmDelete = (id: string) => {
        setWorkshopToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const executeDelete = async () => {
        if (workshopToDelete) {
            await deleteItem('workshops', workshopToDelete);
            setIsDeleteModalOpen(false);
            setWorkshopToDelete(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Find the selected brand object to save the name for backward compatibility
            const selectedBrand = brands.find(b => b.id === formData.brandId);

            const dataToSave = {
                ...formData,
                brand: selectedBrand?.name || formData.brand || '', // Explicitly save brand name
                updatedAt: Timestamp.now(),
                createdAt: editingWorkshop?.createdAt || Timestamp.now()
            };

            if (editingWorkshop && editingWorkshop.id) {
                await updateItem('workshops', editingWorkshop.id, dataToSave);
            } else {
                await addItem('workshops', dataToSave);
            }
            setIsModalOpen(false);
        } catch (error) {
            console.error('Error saving workshop:', error);
            alert('Error al guardar el taller');
        }
    };

    const getAssignedVehicles = (workshopId: string) => {
        return vehicles.filter(v => v.workshopId === workshopId);
    };

    const columns: Column<Workshop>[] = [
        { key: 'name', label: 'Nombre', sortable: true },
        {
            key: 'brandId', // Changed from 'brand' to match the data field, though we use custom render
            label: 'Marca',
            render: (w) => {
                // Find brand name from brandId
                const brand = brands.find(b => b.id === w.brandId);
                return (
                    <span className="font-medium">
                        {brand ? brand.name : (w.brand || '-')}
                    </span>
                );
            }
        },
        {
            key: 'address',
            label: 'Dirección',
            render: (w) => (
                <div className="flex items-start gap-2 max-w-[450px] whitespace-normal">
                    <MapPin className="h-3 w-3 mt-1 text-muted-foreground shrink-0" />
                    <span className="text-sm line-clamp-2" title={w.address}>
                        {w.address}
                    </span>
                </div>
            )
        },
        {
            key: 'phone',
            label: 'Teléfono',
            render: (w) => (
                <span className="flex items-center gap-1 text-sm">
                    <Phone className="h-3 w-3 text-muted-foreground" />
                    {w.phone}
                </span>
            )
        },
        {
            key: 'id' as any,
            label: 'Vehículos Asignados',
            render: (w) => {
                const assignedVehicles = getAssignedVehicles(w.id || '');
                return (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setViewingWorkshop(w);
                            setIsViewVehiclesModalOpen(true);
                        }}
                        className="text-sm font-medium text-primary hover:underline cursor-pointer"
                    >
                        {assignedVehicles.length} vehículo{assignedVehicles.length !== 1 ? 's' : ''}
                    </button>
                );
            }
        },
        {
            key: 'actions',
            label: 'Acciones',
            render: (w) => (
                <div className="flex items-center gap-2">
                    <button
                        onClick={(e) => { e.stopPropagation(); handleOpenModal(w); }}
                        className="p-2 hover:bg-muted rounded-full transition-colors"
                    >
                        <Edit className="h-4 w-4 text-gray-500" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); if (w.id) confirmDelete(w.id); }}
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
                    <h1 className="text-3xl font-bold tracking-tight">Talleres</h1>
                    <p className="text-muted-foreground mt-2">Gestión de talleres mecánicos y asignación de vehículos.</p>
                </div>
            </div>

            <DataTable
                columns={columns}
                data={workshops}
                isLoading={loading}
                title="Talleres Registrados"
                searchPlaceholder="Buscar taller..."
                actionButton={
                    <button
                        onClick={() => handleOpenModal()}
                        className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Nuevo Taller
                    </button>
                }
            />

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingWorkshop ? 'Editar Taller' : 'Nuevo Taller'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Nombre del Taller</label>
                        <div className="relative">
                            <div className="flex gap-2">
                                <input
                                    required
                                    value={formData.name}
                                    onChange={e => {
                                        setFormData({ ...formData, name: e.target.value });
                                        setSearchResults([]); // Clear results on typing
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleSearchLocation();
                                        }
                                    }}
                                    className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                    placeholder="Ej: Taller Central"
                                />
                                <button
                                    type="button"
                                    onClick={handleSearchLocation}
                                    disabled={isSearching || !formData.name}
                                    className="p-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors tooltip disabled:opacity-50"
                                    title="Buscar taller"
                                >
                                    {isSearching ? (
                                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                    ) : (
                                        <Search className="h-5 w-5 text-muted-foreground" />
                                    )}
                                </button>
                            </div>

                            {/* Search Results - Floating Dropdown */}
                            {(searchResults.length > 0 || (isSearching === false && formData.name && searchResults.length === 0)) && (
                                <div className="absolute top-full left-0 right-0 z-50 mt-1 border rounded-lg overflow-hidden max-h-60 overflow-y-auto bg-white shadow-xl dark:bg-slate-950 dark:border-slate-800">
                                    {searchResults.map((result, index) => (
                                        <button
                                            key={index}
                                            type="button"
                                            onClick={() => {
                                                // Auto-complete all fields
                                                setFormData({
                                                    ...formData,
                                                    name: result.name || formData.name, // Use result name if available (cleaner), else keep input
                                                    address: result.display_name,
                                                    phone: formatPhoneNumber(
                                                        result.extratags?.['contact:phone'] ||
                                                        result.extratags?.phone ||
                                                        result.extratags?.['contact:mobile'] ||
                                                        result.extratags?.mobile ||
                                                        formData.phone || ''
                                                    )
                                                });
                                                setSearchResults([]);
                                            }}
                                            className="w-full text-left px-3 py-3 text-sm hover:bg-slate-50 dark:hover:bg-slate-900 border-b last:border-0 border-slate-100 dark:border-slate-800 transition-colors flex items-start gap-2"
                                        >
                                            <Building2 className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                                            <div>
                                                <span className="font-medium block">{result.name || 'Sin nombre'}</span>
                                                <span className="text-xs text-muted-foreground line-clamp-2">{result.display_name}</span>
                                            </div>
                                        </button>
                                    ))}

                                    {/* Google Maps Fallback */}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(formData.name || '')}`, '_blank');
                                        }}
                                        className="w-full text-left px-3 py-3 text-sm bg-blue-50/50 hover:bg-blue-50 text-blue-600 dark:bg-blue-900/10 dark:hover:bg-blue-900/20 dark:text-blue-400 border-t border-slate-100 dark:border-slate-800 transition-colors flex items-center gap-2 font-medium"
                                    >
                                        <ExternalLink className="h-4 w-4 shrink-0" />
                                        <span>¿No lo encuentras? Buscar en Google Maps</span>
                                    </button>
                                </div>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Escribe el nombre del taller y busca para autocompletar dirección y teléfono.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Marca Especializada</label>
                        <select
                            required
                            value={formData.brandId}
                            onChange={e => setFormData({ ...formData, brandId: e.target.value })}
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
                        <label className="text-sm font-medium">Dirección</label>
                        <input
                            required
                            value={formData.address}
                            onChange={e => setFormData({ ...formData, address: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                            placeholder="Calle, número, ciudad"
                        />
                        <p className="text-xs text-muted-foreground">
                            Introduce la dirección completa del taller.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Teléfono</label>
                        <input
                            required
                            type="tel"
                            value={formData.phone}
                            onChange={e => setFormData({ ...formData, phone: formatPhoneNumber(e.target.value) })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                            placeholder="Ej: +34 123 456 789"
                        />
                    </div>

                    {editingWorkshop && (
                        <div className="space-y-3 pt-4 border-t">
                            <label className="text-sm font-medium">Vehículos Asignados</label>
                            <div className="max-h-48 overflow-y-auto space-y-2 border rounded-lg p-3 bg-muted/20">
                                {vehicles.length > 0 ? vehicles.map(vehicle => {
                                    const isAssigned = vehicle.workshopId === editingWorkshop.id;
                                    return (
                                        <label
                                            key={vehicle.id}
                                            className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded cursor-pointer transition-colors"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isAssigned}
                                                onChange={async (e) => {
                                                    if (vehicle.id) {
                                                        await updateItem('vehicles', vehicle.id, {
                                                            workshopId: e.target.checked ? editingWorkshop.id : null
                                                        });
                                                        // Refresh vehicles
                                                        const vData = await getVehicles();
                                                        setVehicles(vData);
                                                    }
                                                }}
                                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                            />
                                            <div className="flex-1">
                                                <p className="text-sm font-medium">
                                                    {vehicle.brand} {vehicle.model}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {vehicle.plate}
                                                </p>
                                            </div>
                                        </label>
                                    );
                                }) : (
                                    <p className="text-sm text-muted-foreground text-center py-4">
                                        No hay vehículos disponibles
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

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
                            {editingWorkshop ? 'Actualizar Taller' : 'Crear Taller'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Delete Confirmation Modal */}
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
                        ¿Estás seguro de que quieres eliminar este taller permanentemente?
                    </p>
                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            onClick={() => setIsDeleteModalOpen(false)}
                            className="px-4 py-2 rounded-lg bg-gray-100 font-medium hover:bg-gray-200 text-gray-700 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={executeDelete}
                            className="px-4 py-2 rounded-lg bg-red-600 font-medium hover:bg-red-700 text-white transition-colors"
                        >
                            Eliminar Taller
                        </button>
                    </div>
                </div>
            </Modal>

            {/* View Assigned Vehicles Modal */}
            <Modal
                isOpen={isViewVehiclesModalOpen}
                onClose={() => {
                    setIsViewVehiclesModalOpen(false);
                    setViewingWorkshop(null);
                }}
                title={`Vehículos de ${viewingWorkshop?.name || 'Taller'}`}
                className="max-w-md"
            >
                <div className="space-y-3">
                    {viewingWorkshop && getAssignedVehicles(viewingWorkshop.id || '').length > 0 ? (
                        getAssignedVehicles(viewingWorkshop.id || '').map(vehicle => (
                            <div
                                key={vehicle.id}
                                className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                            >
                                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <Car className="h-5 w-5 text-primary" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium">
                                        {vehicle.brand} {vehicle.model}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {vehicle.plate} • {vehicle.year}
                                    </p>
                                </div>
                                <div className="text-xs px-2 py-1 rounded-full bg-muted font-medium">
                                    {vehicle.status}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-8">
                            <Car className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                            <p className="text-sm text-muted-foreground">
                                No hay vehículos asignados a este taller
                            </p>
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
}
