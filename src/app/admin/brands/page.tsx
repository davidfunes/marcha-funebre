'use client';

import { useState, useEffect } from 'react';
import {
    Tag,
    Plus,
    Edit,
    Trash2
} from 'lucide-react';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { addItem, updateItem, deleteItem, subscribeToCollection } from '@/services/FirebaseService';
import { VehicleBrand } from '@/types';
import { Timestamp } from 'firebase/firestore';

export default function BrandsPage() {
    const [brands, setBrands] = useState<VehicleBrand[]>([]);
    const [loading, setLoading] = useState(true);

    // Delete Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [brandToDelete, setBrandToDelete] = useState<string | null>(null);

    // Modal & Form
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBrand, setEditingBrand] = useState<VehicleBrand | null>(null);
    const [formData, setFormData] = useState<Partial<VehicleBrand>>({
        name: ''
    });

    useEffect(() => {
        const unsubscribe = subscribeToCollection<VehicleBrand>('brands', (data) => {
            // Sort alphabetically
            const sorted = data.sort((a, b) => a.name.localeCompare(b.name));
            setBrands(sorted);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleOpenModal = (brand?: VehicleBrand) => {
        if (brand) {
            setEditingBrand(brand);
            setFormData(brand);
        } else {
            setEditingBrand(null);
            setFormData({ name: '' });
        }
        setIsModalOpen(true);
    };

    const confirmDelete = (id: string) => {
        setBrandToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const executeDelete = async () => {
        if (brandToDelete) {
            await deleteItem('brands', brandToDelete);
            setIsDeleteModalOpen(false);
            setBrandToDelete(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const dataToSave = {
                ...formData,
                updatedAt: Timestamp.now(),
                createdAt: editingBrand?.createdAt || Timestamp.now()
            };

            if (editingBrand && editingBrand.id) {
                await updateItem('brands', editingBrand.id, dataToSave);
            } else {
                await addItem('brands', dataToSave);
            }
            setIsModalOpen(false);
        } catch (error) {
            console.error('Error saving brand:', error);
            alert('Error al guardar la marca');
        }
    };

    const columns: Column<VehicleBrand>[] = [
        {
            key: 'name',
            label: 'Marca',
            sortable: true,
            render: (b) => (
                <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-primary" />
                    <span className="font-medium">{b.name}</span>
                </div>
            )
        },
        {
            key: 'actions',
            label: 'Acciones',
            render: (b) => (
                <div className="flex items-center gap-2">
                    <button
                        onClick={(e) => { e.stopPropagation(); handleOpenModal(b); }}
                        className="p-2 hover:bg-muted rounded-full transition-colors"
                    >
                        <Edit className="h-4 w-4 text-gray-500" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); if (b.id) confirmDelete(b.id); }}
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
                    <h1 className="text-3xl font-bold tracking-tight">Marcas de Vehículos</h1>
                    <p className="text-muted-foreground mt-2">Gestión de marcas para vehículos y talleres.</p>
                </div>
            </div>

            <DataTable
                columns={columns}
                data={brands}
                isLoading={loading}
                title="Marcas Registradas"
                searchPlaceholder="Buscar marca..."
                breakpoint="2xl"
                mobileItem={(b) => (
                    <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                <Tag className="h-5 w-5" />
                            </div>
                            <span className="font-medium text-foreground">{b.name}</span>
                        </div>
                        <div className="flex gap-1">
                            <button
                                onClick={(e) => { e.stopPropagation(); handleOpenModal(b); }}
                                className="p-2 hover:bg-muted rounded-lg text-muted-foreground transition-colors"
                            >
                                <Edit className="h-4 w-4" />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); if (b.id) confirmDelete(b.id); }}
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
                        Nueva Marca
                    </button>
                }
            />

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingBrand ? 'Editar Marca' : 'Nueva Marca'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Nombre de la Marca</label>
                        <input
                            required
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                            placeholder="Ej: Renault, Peugeot, Opel..."
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
                            {editingBrand ? 'Actualizar Marca' : 'Crear Marca'}
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
                        ¿Estás seguro de que quieres eliminar esta marca permanentemente?
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
                            Eliminar Marca
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
