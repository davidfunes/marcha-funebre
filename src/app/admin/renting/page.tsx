'use client';

import { useState, useEffect } from 'react';
import {
    Plus,
    Edit,
    Trash2,
    Building2,
    Mail,
    Phone,
    FileText
} from 'lucide-react';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { formatPhoneNumber } from '@/lib/utils';
import { addItem, updateItem, deleteItem, subscribeToCollection } from '@/services/FirebaseService';
import { RentingCompany } from '@/types';

export default function RentingPage() {
    const [companies, setCompanies] = useState<RentingCompany[]>([]);
    const [loading, setLoading] = useState(true);

    // Delete Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [companyToDelete, setCompanyToDelete] = useState<string | null>(null);

    // Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCompany, setEditingCompany] = useState<RentingCompany | null>(null);
    const [formData, setFormData] = useState<Partial<RentingCompany>>({
        name: '',
        contactPerson: '',
        email: '',
        phone: '',
        address: '',
        activeContracts: 0
    });

    useEffect(() => {
        const unsubscribe = subscribeToCollection<RentingCompany>('renting_companies', (data) => {
            setCompanies(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleOpenModal = (company?: RentingCompany) => {
        if (company) {
            setEditingCompany(company);
            setFormData(company);
        } else {
            setEditingCompany(null);
            setFormData({
                name: '',
                contactPerson: '',
                email: '',
                phone: '',
                address: '',
                activeContracts: 0
            });
        }
        setIsModalOpen(true);
    };

    const confirmDelete = (id: string) => {
        setCompanyToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const executeDelete = async () => {
        if (companyToDelete) {
            await deleteItem('renting_companies', companyToDelete);
            setIsDeleteModalOpen(false);
            setCompanyToDelete(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const dataToSave = { ...formData };
            if (editingCompany && editingCompany.id) {
                await updateItem('renting_companies', editingCompany.id, dataToSave);
            } else {
                await addItem('renting_companies', dataToSave);
            }
            setIsModalOpen(false);
        } catch (error) {
            console.error('Error saving company:', error);
            alert('Error al guardar la empresa');
        }
    };

    const columns: Column<RentingCompany>[] = [
        {
            key: 'name',
            label: 'Empresa',
            sortable: true,
            render: (c) => (
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700">
                        <Building2 className="h-4 w-4" />
                    </div>
                    <div>
                        <p className="font-medium">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.contactPerson}</p>
                    </div>
                </div>
            )
        },
        {
            key: 'activeContracts',
            label: 'Contratos Activos',
            sortable: true,
            render: (c) => (
                <div className="font-medium text-center bg-muted/50 rounded-full px-2 py-1 inline-block">
                    {c.activeContracts}
                </div>
            )
        },
        {
            key: 'email',
            label: 'Contacto',
            render: (c) => (
                <div className="flex flex-col text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {c.email}
                    </div>
                    <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {c.phone}
                    </div>
                </div>
            )
        },
        {
            key: 'actions',
            label: 'Acciones',
            render: (c) => (
                <div className="flex items-center gap-2">
                    <button
                        onClick={(e) => { e.stopPropagation(); handleOpenModal(c); }}
                        className="p-2 hover:bg-muted rounded-full transition-colors"
                    >
                        <Edit className="h-4 w-4 text-gray-500" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); if (c.id) confirmDelete(c.id); }}
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
                    <h1 className="text-3xl font-bold tracking-tight">Empresas de Renting</h1>
                    <p className="text-muted-foreground mt-2">Gestión de proveedores externos de vehículos.</p>
                </div>
            </div>

            <DataTable
                columns={columns}
                data={companies}
                isLoading={loading}
                title="Proveedores Activos"
                searchPlaceholder="Buscar empresa..."
                actionButton={
                    <button
                        onClick={() => handleOpenModal()}
                        className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Nueva Empresa
                    </button>
                }
            />

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingCompany ? 'Editar Empresa' : 'Nueva Empresa de Renting'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Nombre de la Empresa</label>
                        <input
                            required
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                            placeholder="Ej. LeasePlan"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Persona de Contacto</label>
                        <input
                            required
                            value={formData.contactPerson}
                            onChange={e => setFormData({ ...formData, contactPerson: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                            placeholder="Nombre del gestor"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Email</label>
                            <input
                                type="email"
                                required
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Teléfono</label>
                            <input
                                required
                                value={formData.phone}
                                onChange={e => setFormData({ ...formData, phone: formatPhoneNumber(e.target.value) })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Dirección</label>
                        <input
                            value={formData.address}
                            onChange={e => setFormData({ ...formData, address: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Contratos Activos</label>
                        <input
                            type="number"
                            min="0"
                            value={formData.activeContracts}
                            onChange={e => setFormData({ ...formData, activeContracts: parseInt(e.target.value) })}
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
                            {editingCompany ? 'Guardar Cambios' : 'Crear Empresa'}
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
                        ¿Estás seguro de que quieres eliminar esta empresa permanentemente?
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
                            Eliminar Empresa
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
