'use client';

import { useState, useEffect } from 'react';
import {
    Plus,
    Edit,
    Trash2,
    Wrench,
    DollarSign,
    Calendar,
    CheckCircle
} from 'lucide-react';
import { DataTable, Column } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import { addItem, updateItem, deleteItem, subscribeToCollection, getVehicles } from '@/services/FirebaseService';
import { MaintenanceRecord, Vehicle, Workshop } from '@/types';
import { Timestamp } from 'firebase/firestore';

export default function MaintenancePage() {
    const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>([]);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [workshops, setWorkshops] = useState<Workshop[]>([]);
    const [loading, setLoading] = useState(true);

    // Delete Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [recordToDelete, setRecordToDelete] = useState<string | null>(null);

    // Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState<MaintenanceRecord | null>(null);
    const [formData, setFormData] = useState<Partial<MaintenanceRecord>>({
        vehicleId: '',
        type: 'preventive',
        cost: 0,
        garageName: '',
        description: '',
        status: 'scheduled',
        odometerAtService: 0
    });

    useEffect(() => {
        const unsubscribe = subscribeToCollection<MaintenanceRecord>('maintenance', (data) => {
            setMaintenance(data);
            setLoading(false);
        });

        getVehicles().then(setVehicles);

        const unsubscribeWorkshops = subscribeToCollection<Workshop>('workshops', (data) => {
            setWorkshops(data);
        });

        return () => {
            unsubscribe();
            unsubscribeWorkshops();
        };
    }, []);

    const handleOpenModal = (record?: MaintenanceRecord) => {
        if (record) {
            setEditingRecord(record);
            setFormData(record);
        } else {
            setEditingRecord(null);
            setFormData({
                vehicleId: vehicles[0]?.id || '',
                type: 'preventive',
                cost: 0,
                garageName: '',
                description: '',
                status: 'scheduled',
                odometerAtService: 0
            });
        }
        setIsModalOpen(true);
    };

    const confirmDelete = (id: string) => {
        setRecordToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const executeDelete = async () => {
        if (recordToDelete) {
            await deleteItem('maintenance', recordToDelete);
            setIsDeleteModalOpen(false);
            setRecordToDelete(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const dataToSave = {
                ...formData,
                date: editingRecord?.date || Timestamp.now()
            };

            if (editingRecord && editingRecord.id) {
                await updateItem('maintenance', editingRecord.id, dataToSave);
            } else {
                await addItem('maintenance', dataToSave);
            }
            setIsModalOpen(false);
        } catch (error) {
            console.error('Error saving maintenance:', error);
            alert('Error al guardar el registro');
        }
    };

    const getVehicleName = (id: string) => {
        const v = vehicles.find(v => v.id === id);
        return v ? `${v.brand} ${v.model} (${v.plate})` : 'Vehículo desconocido';
    };

    const columns: Column<MaintenanceRecord>[] = [
        {
            key: 'type',
            label: 'Tipo',
            sortable: true,
            render: (m) => (
                <div className="flex items-center gap-2 capitalize">
                    <Wrench className="h-4 w-4 text-gray-500" />
                    {m.type.replace('_', ' ')}
                </div>
            )
        },
        {
            key: 'vehicleId',
            label: 'Vehículo',
            sortable: true,
            render: (m) => <span className="font-medium">{getVehicleName(m.vehicleId)}</span>
        },
        {
            key: 'cost',
            label: 'Coste',
            sortable: true,
            render: (m) => (
                <div className="flex items-center text-emerald-600 font-medium">
                    <DollarSign className="h-3 w-3" />
                    {m.cost.toFixed(2)}
                </div>
            )
        },
        { key: 'garageName', label: 'Taller', sortable: true },
        {
            key: 'status',
            label: 'Estado',
            sortable: true,
            render: (m) => <StatusBadge status={m.status} />
        },
        {
            key: 'actions',
            label: 'Acciones',
            render: (m) => (
                <div className="flex items-center gap-2">
                    <button
                        onClick={(e) => { e.stopPropagation(); handleOpenModal(m); }}
                        className="p-2 hover:bg-muted rounded-full transition-colors"
                    >
                        <Edit className="h-4 w-4 text-gray-500" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); if (m.id) confirmDelete(m.id); }}
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
                    <h1 className="text-3xl font-bold tracking-tight">Mantenimiento</h1>
                    <p className="text-muted-foreground mt-2">Historial de reparaciones y costes.</p>
                </div>
            </div>

            <DataTable
                columns={columns}
                data={maintenance}
                isLoading={loading}
                title="Registros de Taller"
                searchPlaceholder="Buscar por taller, vehículo..."
                actionButton={
                    <button
                        onClick={() => handleOpenModal()}
                        className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Nuevo Registro
                    </button>
                }
            />

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingRecord ? 'Editar Registro' : 'Nuevo Mantenimiento'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Vehículo</label>
                        <select
                            value={formData.vehicleId}
                            onChange={e => setFormData({ ...formData, vehicleId: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                            required
                        >
                            <option value="">Seleccionar vehículo</option>
                            {vehicles.map(v => (
                                <option key={v.id} value={v.id}>
                                    {v.brand} {v.model} ({v.plate})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Tipo</label>
                            <select
                                value={formData.type}
                                onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                            >
                                <option value="preventive">Preventivo</option>
                                <option value="corrective">Correctivo</option>
                                <option value="inspection">ITV / Inspección</option>
                                <option value="tire_change">Cambio Neumáticos</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Coste (€)</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={formData.cost}
                                onChange={e => setFormData({ ...formData, cost: parseFloat(e.target.value) })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Taller</label>
                            <select
                                value={formData.garageName}
                                onChange={e => setFormData({ ...formData, garageName: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                            >
                                <option value="">Seleccionar taller</option>
                                {(() => {
                                    const selectedVehicle = vehicles.find(v => v.id === formData.vehicleId);
                                    const filteredWorkshops = selectedVehicle
                                        ? workshops.filter(w => w.brandId === selectedVehicle.brandId)
                                        : workshops;

                                    return filteredWorkshops.length > 0 ? (
                                        filteredWorkshops.map(w => (
                                            <option key={w.id} value={w.name}>
                                                {w.name} - {w.brand}
                                            </option>
                                        ))
                                    ) : (
                                        <option disabled>
                                            {selectedVehicle ? 'No hay talleres para esta marca' : 'Selecciona un vehículo primero'}
                                        </option>
                                    );
                                })()}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Km Actuales</label>
                            <input
                                type="number"
                                value={formData.odometerAtService}
                                onChange={e => setFormData({ ...formData, odometerAtService: parseInt(e.target.value) })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Descripción</label>
                        <textarea
                            rows={3}
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none resize-none"
                            placeholder="Detalles de la reparación..."
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Estado</label>
                        <select
                            value={formData.status}
                            onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                        >
                            <option value="scheduled">Programado</option>
                            <option value="in_progress">En Taller</option>
                            <option value="completed">Completado</option>
                        </select>
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
                            {editingRecord ? 'Guardar Cambios' : 'Crear Registro'}
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
                        ¿Estás seguro de que quieres eliminar este registro permanentemente?
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
                            Eliminar Registro
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
