'use client';

import { useState, useEffect } from 'react';
import {
    AlertTriangle,
    CheckCircle,
    Plus,
    Edit,
    Trash2,
    AlertCircle,
    Music,
    Wrench,
    Package
} from 'lucide-react';
import { DataTable, Column } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import { addItem, updateItem, deleteItem, subscribeToCollection, getVehicles, getUsers, getInventory } from '@/services/FirebaseService';
import { Incident, Vehicle, User, IncidentPriority, IncidentStatus, InventoryItem } from '@/types';
import { Timestamp } from 'firebase/firestore';

export default function IncidentsPage() {
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);

    // Delete Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [incidentToDelete, setIncidentToDelete] = useState<string | null>(null);

    // Modal & Form
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingIncident, setEditingIncident] = useState<Incident | null>(null);
    const [formData, setFormData] = useState<Partial<Incident>>({
        title: '',
        description: '',
        priority: 'medium',
        status: 'open',
        vehicleId: '',
        reportedByUserId: ''
    });

    useEffect(() => {
        // Subscribe to real-time incidents
        const unsubscribe = subscribeToCollection<Incident>('incidents', (data) => {
            setIncidents(data);
            setLoading(false);
        });

        // Load dependencies
        const loadDependencies = async () => {
            const [vData, uData, invData] = await Promise.all([getVehicles(), getUsers(), getInventory()]);
            setVehicles(vData);
            setUsers(uData);
            setInventory(invData);
        };
        loadDependencies();

        return () => unsubscribe();
    }, []);

    const handleOpenModal = (incident?: Incident) => {
        if (incident) {
            setEditingIncident(incident);
            setFormData(incident);
        } else {
            setEditingIncident(null);
            setFormData({
                title: '',
                description: '',
                priority: 'medium',
                status: 'open',
                vehicleId: vehicles[0]?.id || '',
                reportedByUserId: users[0]?.id || ''
            });
        }
        setIsModalOpen(true);
    };

    const confirmDelete = (id: string) => {
        setIncidentToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const executeDelete = async () => {
        if (incidentToDelete) {
            await deleteItem('incidents', incidentToDelete);
            setIsDeleteModalOpen(false);
            setIncidentToDelete(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const dataToSave = {
                ...formData,
                updatedAt: Timestamp.now(),
                createdAt: editingIncident?.createdAt || Timestamp.now()
            };

            if (editingIncident && editingIncident.id) {
                await updateItem('incidents', editingIncident.id, dataToSave);
            } else {
                await addItem('incidents', dataToSave);
            }
            setIsModalOpen(false);
        } catch (error) {
            console.error('Error saving incident:', error);
            alert('Error al guardar la incidencia');
        }
    };

    // Helper to find names
    const getVehicleName = (id: string) => {
        const v = vehicles.find(v => v.id === id);
        return v ? `${v.brand} ${v.model} (${v.plate})` : 'Vehículo desconocido';
    };
    const getUserName = (id: string) => {
        const u = users.find(u => u.id === id);
        return u ? u.name : 'Usuario desconocido';
    };

    const columns: Column<Incident>[] = [
        {
            key: 'priority',
            label: 'Prioridad',
            sortable: true,
            render: (i) => <StatusBadge status={i.priority} />
        },
        { key: 'title', label: 'Incidencia', sortable: true },
        {
            key: 'vehicleId',
            label: 'Vehículo Afectado',
            render: (i) => <span className="text-sm font-medium">{getVehicleName(i.vehicleId)}</span>
        },
        {
            key: 'inventoryItemId',
            label: 'Material',
            render: (i) => i.inventoryItemId ? (
                <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                    <Music className="h-3 w-3" />
                    <span className="text-sm font-medium">{inventory.find(inv => inv.id === i.inventoryItemId)?.name || 'Cargando...'}</span>
                </div>
            ) : <span className="text-xs text-muted-foreground italic">No vinculado</span>
        },
        {
            key: 'reportedByUserId',
            label: 'Reportado Por',
            render: (i) => <span className="text-sm text-muted-foreground">{getUserName(i.reportedByUserId)}</span>
        },
        {
            key: 'status',
            label: 'Estado',
            sortable: true,
            render: (i) => <StatusBadge status={i.status} />
        },
        {
            key: 'actions',
            label: 'Acciones',
            render: (i) => (
                <div className="flex items-center gap-2">
                    <button
                        onClick={(e) => { e.stopPropagation(); handleOpenModal(i); }}
                        className="p-2 hover:bg-muted rounded-full transition-colors"
                    >
                        <Edit className="h-4 w-4 text-gray-500" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); if (i.id) confirmDelete(i.id); }}
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
                    <h1 className="text-3xl font-bold tracking-tight">Incidencias</h1>
                    <p className="text-muted-foreground mt-2">Reporte y seguimiento de averías y problemas.</p>
                </div>
            </div>

            <DataTable
                columns={columns}
                data={incidents}
                isLoading={loading}
                title="Historial de Incidencias"
                searchPlaceholder="Buscar incidencia..."
                breakpoint="2xl"
                mobileItem={(incident) => (
                    <div className="bg-card p-4 rounded-xl border border-border shadow-sm space-y-4">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${incident.priority === 'critical' ? 'bg-red-100 text-red-600' :
                                    incident.priority === 'high' ? 'bg-orange-100 text-orange-600' :
                                        incident.priority === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                                            'bg-blue-100 text-blue-600'
                                    }`}>
                                    <AlertTriangle className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-foreground line-clamp-1">{incident.title}</h3>
                                    <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${incident.priority === 'critical' ? 'bg-red-100 text-red-700' :
                                        incident.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                                            incident.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-blue-100 text-blue-700'
                                        }`}>
                                        {incident.priority}
                                    </span>
                                </div>
                            </div>
                            <StatusBadge status={incident.status} />
                        </div>

                        <div className="space-y-2 text-sm border-y border-border/50 py-3">
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-muted-foreground">Vehículo</span>
                                <span className="font-medium max-w-[200px] truncate text-right">{getVehicleName(incident.vehicleId)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-muted-foreground">Reportado por</span>
                                <span className="font-medium">{getUserName(incident.reportedByUserId)}</span>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
                            <button
                                onClick={(e) => { e.stopPropagation(); handleOpenModal(incident); }}
                                className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 text-xs font-medium"
                            >
                                <Edit className="h-3.5 w-3.5" />
                                <span>Editar</span>
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); if (incident.id) confirmDelete(incident.id); }}
                                className="p-2 hover:bg-red-50 hover:text-red-600 rounded-lg text-muted-foreground transition-colors flex items-center gap-2 text-xs font-medium dark:hover:bg-red-900/20"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span>Eliminar</span>
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
                        Nuevo Incidencia
                    </button>
                }
            />

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingIncident ? 'Gestionar Incidencia' : 'Nueva Incidencia'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    {formData.inventoryItemId && (
                        <div className="p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 rounded-xl flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-white dark:bg-purple-800 flex items-center justify-center text-purple-600 dark:text-purple-400">
                                <Music className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Material Vinculado</p>
                                <p className="text-sm font-semibold">{inventory.find(inv => inv.id === formData.inventoryItemId)?.name || 'Cargando...'}</p>
                                <p className="text-xs text-muted-foreground mt-0.5 font-medium flex items-center gap-1">
                                    <Wrench className="h-3 w-3" />
                                    <span>Resolver esta incidencia restaurará el material al stock.</span>
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Título</label>
                        <input
                            required
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                            placeholder="Ej: Fallo de frenos"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Descripción Detallada</label>
                        <textarea
                            rows={3}
                            required
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none resize-none"
                            placeholder="Describe el problema..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
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
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Reportado por</label>
                            <select
                                value={formData.reportedByUserId}
                                onChange={e => setFormData({ ...formData, reportedByUserId: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                required
                            >
                                <option value="">Seleccionar usuario</option>
                                {users.map(u => (
                                    <option key={u.id} value={u.id}>
                                        {u.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Prioridad</label>
                            <select
                                value={formData.priority}
                                onChange={e => setFormData({ ...formData, priority: e.target.value as IncidentPriority })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                            >
                                <option value="low">Baja</option>
                                <option value="medium">Media</option>
                                <option value="high">Alta</option>
                                <option value="critical">Crítica</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Estado</label>
                            <select
                                value={formData.status}
                                onChange={e => setFormData({ ...formData, status: e.target.value as IncidentStatus })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                            >
                                <option value="open">Abierta</option>
                                <option value="in_progress">En Progreso</option>
                                <option value="resolved">Resuelta</option>
                                <option value="closed">Cerrada</option>
                            </select>
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
                            {editingIncident ? 'Actualizar Incidencia' : 'Crear Incidencia'}
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
                        ¿Estás seguro de que quieres eliminar esta incidencia permanentemente?
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
                            Eliminar Incidencia
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
