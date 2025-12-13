'use client';

import { useState, useEffect } from 'react';
import {
    Plus,
    Edit,
    Trash2,
    Warehouse as WarehouseIcon,
    MapPin,
    Package,
    Search,
    Loader2,
    ExternalLink
} from 'lucide-react';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { addItem, updateItem, deleteItem, subscribeToCollection } from '@/services/FirebaseService';
import { Warehouse } from '@/types';

export default function WarehousesPage() {
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [loading, setLoading] = useState(true);

    // Delete Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [warehouseToDelete, setWarehouseToDelete] = useState<string | null>(null);

    // Modal & Form
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
    const [formData, setFormData] = useState<Partial<Warehouse>>({
        name: '',
        location: '',
        capacity: 100
    });

    // Address Search State
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<any[]>([]);

    const handleSearchLocation = async () => {
        if (!formData.location) return;

        setIsSearching(true);
        try {
            // Using OpenStreetMap Nominatim API for address search (free, no key required for low usage)
            // Added limit=25, addressdetails=1, and dedupe=0 to get maximum possible results without filtering
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(formData.location)}&limit=25&addressdetails=1&dedupe=0`);
            const data = await response.json();
            setSearchResults(data);
            if (data.length === 0) {
                alert('No se encontraron direcciones para esta búsqueda.');
            }
        } catch (error) {
            console.error('Error searching location:', error);
            alert('Error al buscar la dirección.');
        } finally {
            setIsSearching(false);
        }
    };

    useEffect(() => {
        const unsubscribe = subscribeToCollection<Warehouse>('warehouses', (data) => {
            setWarehouses(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleOpenModal = (warehouse?: Warehouse) => {
        if (warehouse) {
            setEditingWarehouse(warehouse);
            setFormData(warehouse);
        } else {
            setEditingWarehouse(null);
            setFormData({
                name: '',
                location: '',
                capacity: 100
            });
        }
        setIsModalOpen(true);
    };

    const confirmDelete = (id: string) => {
        setWarehouseToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const executeDelete = async () => {
        if (warehouseToDelete) {
            await deleteItem('warehouses', warehouseToDelete);
            setIsDeleteModalOpen(false);
            setWarehouseToDelete(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const dataToSave = { ...formData };
            if (editingWarehouse && editingWarehouse.id) {
                await updateItem('warehouses', editingWarehouse.id, dataToSave);
            } else {
                await addItem('warehouses', dataToSave);
            }
            setIsModalOpen(false);
        } catch (error) {
            console.error('Error saving warehouse:', error);
            alert('Error al guardar el almacén');
        }
    };

    const columns: Column<Warehouse>[] = [
        {
            key: 'name',
            label: 'Nombre',
            sortable: true,
            render: (w) => (
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
                        <WarehouseIcon className="h-4 w-4" />
                    </div>
                    <span className="font-medium">{w.name}</span>
                </div>
            )
        },
        {
            key: 'location',
            label: 'Ubicación',
            sortable: true,
            render: (w) => (
                <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {w.location}
                </div>
            )
        },
        {
            key: 'capacity',
            label: 'Capacidad',
            sortable: true,
            render: (w) => (
                <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-blue-500" />
                    {w.capacity} slots
                </div>
            )
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
                    <h1 className="text-3xl font-bold tracking-tight">Almacenes</h1>
                    <p className="text-muted-foreground mt-2">Gestión de ubicaciones físicas y depósitos.</p>
                </div>
            </div>

            <DataTable
                columns={columns}
                data={warehouses}
                isLoading={loading}
                title="Red de Almacenes"
                searchPlaceholder="Buscar almacén..."
                breakpoint="2xl"
                mobileItem={(w) => (
                    <div className="bg-card p-4 rounded-xl border border-border shadow-sm space-y-3">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
                                    <WarehouseIcon className="h-5 w-5" />
                                </div>
                                <h3 className="font-semibold text-foreground">{w.name}</h3>
                            </div>
                            <div className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-medium">
                                <Package className="h-3 w-3" />
                                {w.capacity}
                            </div>
                        </div>

                        <div className="flex items-start gap-2 text-sm text-muted-foreground pt-1">
                            <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                            <span className="line-clamp-2">{w.location}</span>
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
                            <button
                                onClick={(e) => { e.stopPropagation(); handleOpenModal(w); }}
                                className="p-2 hover:bg-muted rounded-lg text-muted-foreground transition-colors"
                            >
                                <Edit className="h-4 w-4" />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); if (w.id) confirmDelete(w.id); }}
                                className="p-2 hover:bg-red-50 text-muted-foreground hover:text-red-500 rounded-lg transition-colors"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}
                actionButton={
                    <button
                        onClick={() => handleOpenModal()}
                        className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Nuevo Almacén
                    </button>
                }
            />

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingWarehouse ? 'Editar Almacén' : 'Nuevo Almacén'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Nombre del Almacén</label>
                        <input
                            required
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                            placeholder="Almacén Central"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Ubicación / Dirección</label>
                        <div className="relative">
                            <div className="flex gap-2">
                                <input
                                    required
                                    value={formData.location}
                                    onChange={e => {
                                        setFormData({ ...formData, location: e.target.value });
                                        setSearchResults([]); // Clear results on typing
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleSearchLocation();
                                        }
                                    }}
                                    className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                    placeholder="C/ Ejemplo 123, Madrid"
                                />
                                <button
                                    type="button"
                                    onClick={handleSearchLocation}
                                    disabled={isSearching || !formData.location}
                                    className="p-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors tooltip disabled:opacity-50"
                                    title="Buscar direcciones"
                                >
                                    {isSearching ? (
                                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                    ) : (
                                        <Search className="h-5 w-5 text-muted-foreground" />
                                    )}
                                </button>
                            </div>

                            {/* Search Results - Floating Dropdown */}
                            {(searchResults.length > 0 || (isSearching === false && formData.location && searchResults.length === 0)) && (
                                <div className="absolute top-full left-0 right-0 z-50 mt-1 border rounded-lg overflow-hidden max-h-60 overflow-y-auto bg-white shadow-xl dark:bg-slate-950 dark:border-slate-800">
                                    {searchResults.map((result, index) => (
                                        <button
                                            key={index}
                                            type="button"
                                            onClick={() => {
                                                setFormData({ ...formData, location: result.display_name });
                                                setSearchResults([]);
                                            }}
                                            className="w-full text-left px-3 py-3 text-sm hover:bg-slate-50 dark:hover:bg-slate-900 border-b last:border-0 border-slate-100 dark:border-slate-800 transition-colors flex items-start gap-2"
                                        >
                                            <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                                            <span className="line-clamp-2">{result.display_name}</span>
                                        </button>
                                    ))}

                                    {/* Google Maps Fallback */}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(formData.location || '')}`, '_blank');
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
                            Escribe una ubicación y pulsa Enter o la lupa para buscar direcciones sugeridas.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Capacidad Total (Items)</label>
                        <input
                            type="number"
                            min="1"
                            value={formData.capacity}
                            onChange={e => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                        />
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
                            {editingWarehouse ? 'Guardar Cambios' : 'Crear Almacén'}
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
                        ¿Estás seguro de que quieres eliminar este almacén permanentemente?
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
                            Eliminar Almacén
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
