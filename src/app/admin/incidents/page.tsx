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
    Package,
    Eye,
    Calendar,
    Clock,
    User as UserIcon,
    MapPin,
    Camera
} from 'lucide-react';
import { DataTable, Column } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import { addItem, updateItem, deleteItem, subscribeToCollection, getVehicles, getUsers, getInventory } from '@/services/FirebaseService';
import { Incident, Vehicle, User, IncidentPriority, IncidentStatus, InventoryItem } from '@/types';
import { Timestamp } from 'firebase/firestore';
import { getFullName, getUserInitials } from '@/utils/userUtils';

export default function IncidentsPage() {
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);

    // Delete Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [incidentToDelete, setIncidentToDelete] = useState<string | null>(null);

    // View Modal State
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [viewingIncident, setViewingIncident] = useState<Incident | null>(null);

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

    const handleViewIncident = (incident: Incident) => {
        setViewingIncident(incident);
        setIsViewModalOpen(true);
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
            render: (i) => {
                const u = users.find(user => user.id === i.reportedByUserId);
                return (
                    <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center shrink-0 text-secondary-foreground font-bold text-[10px]">
                            {getUserInitials(u)}
                        </div>
                        <span className="text-sm font-medium">{getFullName(u)}</span>
                    </div>
                );
            }
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
                        onClick={(e) => { e.stopPropagation(); handleViewIncident(i); }}
                        className="p-2 hover:bg-blue-50 rounded-full transition-colors group"
                        title="Ver detalles"
                    >
                        <Eye className="h-4 w-4 text-blue-500 group-hover:text-blue-600" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleOpenModal(i); }}
                        className="p-2 hover:bg-muted rounded-full transition-colors"
                        title="Editar"
                    >
                        <Edit className="h-4 w-4 text-gray-500" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); if (i.id) confirmDelete(i.id); }}
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
                    <h1 className="text-3xl font-bold tracking-tight">Incidencias</h1>
                    <p className="text-muted-foreground mt-2">Reporte y seguimiento de averías y problemas.</p>
                </div>
            </div>

            {/* Modal de Detalles de Incidencia */}
            <Modal
                isOpen={isViewModalOpen}
                onClose={() => setIsViewModalOpen(false)}
                title="Detalles de la Incidencia"
                className="max-w-2xl px-0 sm:px-0" // Quitar padding lateral para controlar mejor el diseño
            >
                <div className="flex flex-col max-h-[85vh]">
                    {/* Header con Estado y Prioridad */}
                    <div className="px-6 pb-6 border-b border-border/50">
                        <div className="flex flex-wrap items-center gap-3 mb-4">
                            <StatusBadge status={viewingIncident?.status || 'open'} />
                            <StatusBadge status={viewingIncident?.priority || 'medium'} />
                        </div>
                        <h2 className="text-2xl font-bold text-foreground leading-tight">
                            {viewingIncident?.title}
                        </h2>
                    </div>

                    <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
                        {/* Descripción */}
                        <section className="space-y-3">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                <AlertCircle className="h-4 w-4" />
                                Descripción del Problema
                            </h3>
                            <div className="bg-muted/30 p-4 rounded-xl border border-border/50">
                                <p className="text-foreground leading-relaxed">
                                    {viewingIncident?.description || 'Sin descripción detallada.'}
                                </p>
                            </div>
                        </section>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Información del Vehículo */}
                            <section className="space-y-3">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                    <MapPin className="h-4 w-4" />
                                    Vehículo Relacionado
                                </h3>
                                <div className="space-y-1">
                                    <p className="font-semibold text-lg">{getVehicleName(viewingIncident?.vehicleId || '')}</p>
                                    <p className="text-sm text-muted-foreground">ID: {viewingIncident?.vehicleId}</p>
                                </div>
                            </section>

                            {/* Información del Usuario */}
                            <section className="space-y-3">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                    <UserIcon className="h-4 w-4" />
                                    Reportado Por
                                </h3>
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground font-bold text-sm">
                                        {getUserInitials(users.find(u => u.id === viewingIncident?.reportedByUserId))}
                                    </div>
                                    <div>
                                        <p className="font-semibold">{getFullName(users.find(u => u.id === viewingIncident?.reportedByUserId))}</p>
                                        <p className="text-xs text-muted-foreground">Colaborador</p>
                                    </div>
                                </div>
                            </section>
                        </div>

                        {/* Material (Si aplica) */}
                        {viewingIncident?.inventoryItemId && (
                            <section className="space-y-3">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                    <Package className="h-4 w-4" />
                                    Material / Equipaje Afectado
                                </h3>
                                <div className="p-4 bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-800/50 rounded-xl flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-lg bg-white dark:bg-purple-900/20 flex items-center justify-center text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
                                        <Music className="h-7 w-7" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-purple-700 dark:text-purple-300">
                                            {inventory.find(inv => inv.id === viewingIncident?.inventoryItemId)?.name || 'Cargando...'}
                                        </p>
                                        <p className="text-sm text-purple-600/70 dark:text-purple-400/70">
                                            Estado reportado: {viewingIncident?.status === 'resolved' ? 'Reparado' : 'Averiado'}
                                        </p>
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* Imágenes (Si hay) */}
                        {viewingIncident?.images && viewingIncident.images.length > 0 && (
                            <section className="space-y-3">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                    <Camera className="h-4 w-4" />
                                    Evidencias Fotográficas
                                </h3>
                                <div className="grid grid-cols-2 gap-3">
                                    {viewingIncident.images.map((img, idx) => (
                                        <div key={idx} className="relative aspect-video rounded-xl overflow-hidden border border-border group">
                                            <img
                                                src={img}
                                                alt={`Evidencia ${idx + 1}`}
                                                className="object-cover w-full h-full transition-transform group-hover:scale-105"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Fechas */}
                        <section className="pt-4 grid grid-cols-2 gap-4 border-t border-border/50 text-xs text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <Calendar className="h-3 w-3" />
                                <span>Creado: {viewingIncident?.createdAt instanceof Timestamp ? viewingIncident.createdAt.toDate().toLocaleString() : 'Recientemente'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Clock className="h-3 w-3" />
                                <span>Actualizado: {viewingIncident?.updatedAt instanceof Timestamp ? viewingIncident.updatedAt.toDate().toLocaleString() : 'Recientemente'}</span>
                            </div>
                        </section>
                    </div>

                    {/* Footer con Botones de Acción */}
                    <div className="p-6 bg-muted/20 border-t border-border/50 flex flex-wrap justify-end gap-3">
                        <button
                            onClick={() => setIsViewModalOpen(false)}
                            className="px-6 py-2.5 rounded-xl bg-background border border-border font-bold text-sm hover:bg-muted transition-colors"
                        >
                            Cerrar
                        </button>
                        <button
                            onClick={() => {
                                setIsViewModalOpen(false);
                                if (viewingIncident) handleOpenModal(viewingIncident);
                            }}
                            className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-all shadow-sm flex items-center gap-2"
                        >
                            <Edit className="h-4 w-4" />
                            Editar Incidencia
                        </button>
                    </div>
                </div>
            </Modal>

            <DataTable
                columns={columns}
                data={incidents}
                isLoading={loading}
                title="Historial de Incidencias"
                searchPlaceholder="Buscar incidencia..."
                onRowClick={handleViewIncident}
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
                                <div className="flex items-center gap-2">
                                    <div className="h-5 w-5 rounded-full bg-secondary flex items-center justify-center shrink-0 text-secondary-foreground font-bold text-[8px]">
                                        {getUserInitials(users.find(u => u.id === incident.reportedByUserId))}
                                    </div>
                                    <span className="font-medium">{getUserName(incident.reportedByUserId)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
                            <button
                                onClick={(e) => { e.stopPropagation(); handleViewIncident(incident); }}
                                className="p-2 hover:bg-blue-50 hover:text-blue-600 rounded-lg text-muted-foreground transition-colors flex items-center gap-2 text-xs font-medium dark:hover:bg-blue-900/20"
                            >
                                <Eye className="h-3.5 w-3.5 text-blue-500" />
                                <span>Ver</span>
                            </button>
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
                                <Trash2 className="h-3.5 w-3.5 text-red-500" />
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
