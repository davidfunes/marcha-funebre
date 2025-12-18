'use client';

import { useState, useEffect } from 'react';
import {
    Plus,
    Edit,
    Trash2,
    Wrench,
    DollarSign,
    Calendar as CalendarIcon,
    List as ListIcon,
    Filter,
    X
} from 'lucide-react';
import { DataTable, Column } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import { addItem, updateItem, deleteItem, subscribeToCollection, getVehicles } from '@/services/FirebaseService';
import { MaintenanceRecord, Vehicle, Workshop } from '@/types';
import { Timestamp } from 'firebase/firestore';
import { MaintenanceCalendar } from '@/components/maintenance/MaintenanceCalendar';
import { format } from 'date-fns';

export default function MaintenancePage() {
    const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
    const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>([]);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [workshops, setWorkshops] = useState<Workshop[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [filterWorkshop, setFilterWorkshop] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<string>('all');

    // Delete Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [recordToDelete, setRecordToDelete] = useState<string | null>(null);

    // Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState<MaintenanceRecord | null>(null);

    // Initial form state helper
    const getInitialFormData = (date?: Date): Partial<MaintenanceRecord> => ({
        vehicleId: '',
        workshopId: '',
        type: 'preventive',
        cost: 0,
        garageName: '',
        description: '',
        status: 'scheduled',
        odometerAtService: 0,
        date: date ? Timestamp.fromDate(date) : Timestamp.now()
    });

    const [formData, setFormData] = useState<Partial<MaintenanceRecord>>(getInitialFormData());

    useEffect(() => {
        const unsubscribe = subscribeToCollection<MaintenanceRecord>('maintenance', (data) => {
            setMaintenance(data);
            setLoading(false);
        });

        getVehicles().then(setVehicles);

        const unsubscribeWorkshops = subscribeToCollection<Workshop>('workshops', (data) => {
            setWorkshops(data);
            // Default select 'all' if not set
            if (workshops.length === 0) setFilterWorkshop('all');
        });

        return () => {
            unsubscribe();
            unsubscribeWorkshops();
        };
    }, []);

    // Filter Logic
    const filteredRecords = maintenance.filter(record => {
        if (filterWorkshop !== 'all' && record.workshopId !== filterWorkshop) return false;
        if (filterStatus !== 'all' && record.status !== filterStatus) return false;
        return true;
    });

    const handleOpenModal = (record?: MaintenanceRecord, date?: Date) => {
        if (record) {
            setEditingRecord(record);
            setFormData(record);
        } else {
            setEditingRecord(null);
            setFormData(getInitialFormData(date));
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
            // Find selected workshop to populate garageName for backward compatibility
            const selectedWorkshop = workshops.find(w => w.id === formData.workshopId);
            const dataToSave = {
                ...formData,
                garageName: selectedWorkshop ? selectedWorkshop.name : (formData.garageName || 'Taller Externo')
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

    // Auto-select workshop when vehicle changes
    const handleVehicleChange = (vehicleId: string) => {
        const title = vehicles.find(v => v.id === vehicleId);
        const updates: any = { vehicleId };

        if (title?.workshopId) {
            updates.workshopId = title.workshopId;
        }

        setFormData(prev => ({ ...prev, ...updates }));
    };

    const getVehicleName = (id: string) => {
        const v = vehicles.find(v => v.id === id);
        return v ? `${v.plate} - ${v.brand} ${v.model}` : 'Vehículo desconocido';
    };

    const getWorkshopName = (id?: string) => {
        if (!id) return '-';
        const w = workshops.find(w => w.id === id);
        return w ? w.name : 'Desconocido';
    };

    const columns: Column<MaintenanceRecord>[] = [
        {
            key: 'date',
            label: 'Fecha y Hora',
            sortable: true,
            render: (m) => {
                const date = m.date?.seconds ? new Date(m.date.seconds * 1000) : new Date(m.date);
                return (
                    <div className="flex flex-col">
                        <span className="font-medium">{format(date, 'dd/MM/yyyy')}</span>
                        <span className="text-xs text-muted-foreground">{format(date, 'HH:mm')}</span>
                    </div>
                );
            }
        },
        {
            key: 'vehicleId',
            label: 'Vehículo',
            sortable: true,
            render: (m) => <span className="font-medium text-foreground">{getVehicleName(m.vehicleId)}</span>
        },
        {
            key: 'workshopId',
            label: 'Taller',
            sortable: true,
            render: (m) => (
                <div className="flex flex-col">
                    <span className="font-medium">{getWorkshopName(m.workshopId) !== 'Desconocido' ? getWorkshopName(m.workshopId) : m.garageName}</span>
                    <span className="text-xs text-muted-foreground">{m.garageName !== getWorkshopName(m.workshopId) ? m.garageName : ''}</span>
                </div>
            )
        },
        {
            key: 'type',
            label: 'Tipo',
            sortable: true,
            render: (m) => (
                <div className="flex items-center gap-2 capitalize">
                    <Wrench className="h-3 w-3 text-muted-foreground" />
                    {m.type?.replace('_', ' ')}
                </div>
            )
        },
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
                <div className="flex items-center gap-2 justify-end">
                    <button
                        onClick={(e) => { e.stopPropagation(); handleOpenModal(m); }}
                        className="p-2 hover:bg-muted rounded-full transition-colors"
                    >
                        <Edit className="h-4 w-4 text-muted-foreground" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); if (m.id) confirmDelete(m.id); }}
                        className="p-2 hover:bg-red-50 rounded-full transition-colors group"
                    >
                        <Trash2 className="h-4 w-4 text-red-400 group-hover:text-red-500" />
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Agenda de Taller</h1>
                    <p className="text-muted-foreground mt-1">Gestión de citas y mantenimiento de flota.</p>
                </div>

                <div className="flex items-center gap-2 bg-card p-1 rounded-lg border border-border shadow-sm">
                    <button
                        onClick={() => setViewMode('calendar')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'calendar'
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-muted-foreground hover:bg-muted'
                            }`}
                    >
                        <CalendarIcon className="w-4 h-4" />
                        Calendario
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'list'
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-muted-foreground hover:bg-muted'
                            }`}
                    >
                        <ListIcon className="w-4 h-4" />
                        Listado
                    </button>
                </div>
            </div>

            {/* Filters & Actions */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card p-4 rounded-xl border border-border shadow-sm">
                <div className="flex items-center gap-4 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground border-r border-border pr-4">
                        <Filter className="w-4 h-4" />
                        <span>Filtros</span>
                    </div>

                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="bg-background border border-input text-sm rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-primary/50"
                    >
                        <option value="all">Todos los Estados</option>
                        <option value="scheduled">Programado</option>
                        <option value="in_progress">En Taller</option>
                        <option value="completed">Completado</option>
                    </select>

                    <select
                        value={filterWorkshop}
                        onChange={(e) => setFilterWorkshop(e.target.value)}
                        className="bg-background border border-input text-sm rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-primary/50 min-w-[150px]"
                    >
                        <option value="all">Todos los Talleres</option>
                        {workshops.map(w => (
                            <option key={w.id} value={w.id}>{w.name}</option>
                        ))}
                    </select>
                </div>

                <button
                    onClick={() => handleOpenModal()}
                    className="w-full md:w-auto inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:scale-[1.02]"
                >
                    <Plus className="mr-2 h-4 w-4" />
                    Nueva Cita
                </button>
            </div>

            {/* Content View */}
            <div className="min-h-[600px]">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                ) : viewMode === 'calendar' ? (
                    <MaintenanceCalendar
                        records={filteredRecords}
                        vehicles={vehicles}
                        workshops={workshops}
                        onSelectDate={(date) => handleOpenModal(undefined, date)}
                        onSelectRecord={(record) => handleOpenModal(record)}
                    />
                ) : (
                    <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
                        <DataTable
                            columns={columns}
                            data={filteredRecords}
                            isLoading={loading}
                            title=""
                            searchPlaceholder="Buscar por vehículo, taller..."
                        />
                    </div>
                )}
            </div>

            {/* Edit/Create Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingRecord ? 'Gestionar Cita' : 'Nueva Cita de Taller'}
                className="max-w-2xl"
            >
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Left Column */}
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Vehículo</label>
                                <select
                                    value={formData.vehicleId}
                                    onChange={e => handleVehicleChange(e.target.value)}
                                    className="w-full px-3 py-2.5 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                    required
                                >
                                    <option value="">Seleccionar vehículo</option>
                                    {vehicles.map(v => (
                                        <option key={v.id} value={v.id}>
                                            {v.plate} - {v.brand} {v.model}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Taller Asignado</label>
                                <select
                                    value={formData.workshopId}
                                    onChange={e => setFormData({ ...formData, workshopId: e.target.value })}
                                    className="w-full px-3 py-2.5 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                >
                                    <option value="">Seleccionar taller...</option>
                                    {workshops.map(w => (
                                        <option key={w.id} value={w.id}>
                                            {w.name} ({w.brand})
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs text-muted-foreground">
                                    Se autoselecciona el taller asignado al vehículo, pero puedes cambiarlo.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Fecha y Hora</label>
                                <input
                                    type="datetime-local"
                                    value={formData.date?.toDate ? format(formData.date.toDate(), "yyyy-MM-dd'T'HH:mm") : ''}
                                    onChange={e => {
                                        const newDate = new Date(e.target.value);
                                        setFormData({ ...formData, date: Timestamp.fromDate(newDate) });
                                    }}
                                    className="w-full px-3 py-2.5 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                    required
                                />
                            </div>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Tipo de Intervención</label>
                                <select
                                    value={formData.type}
                                    onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                                    className="w-full px-3 py-2.5 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                >
                                    <option value="preventive">Mantenimiento Preventivo</option>
                                    <option value="corrective">Reparación Correctiva (Avería)</option>
                                    <option value="inspection">ITV / Inspección</option>
                                    <option value="tire_change">Cambio de Neumáticos</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Estado</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['scheduled', 'in_progress', 'completed'].map(status => (
                                        <button
                                            type="button"
                                            key={status}
                                            onClick={() => setFormData({ ...formData, status: status as any })}
                                            className={`px-2 py-2 text-xs font-semibold rounded-lg border transition-all ${formData.status === status
                                                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                                : 'bg-background hover:bg-muted text-muted-foreground border-input'
                                                } capitalize`}
                                        >
                                            {status.replace('_', ' ')}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Optional Cost - hidden/minimized as per instructions, but kept as inputs just in case */}
                            <div className="pt-2 border-t border-border mt-4">
                                <details className="group">
                                    <summary className="flex items-center gap-2 text-xs font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground">
                                        <DollarSign className="w-3 h-3" />
                                        <span>Datos Económicos (Opcional)</span>
                                    </summary>
                                    <div className="mt-3 grid grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                                        <div className="space-y-1">
                                            <label className="text-xs">Coste (€)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={formData.cost}
                                                onChange={e => setFormData({ ...formData, cost: parseFloat(e.target.value) })}
                                                className="w-full px-2 py-1.5 text-sm bg-background border border-input rounded-md"
                                            />
                                        </div>
                                    </div>
                                </details>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Notas / Descripción</label>
                        <textarea
                            rows={3}
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-3 py-2.5 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary outline-none resize-none"
                            placeholder="Detalles sobre la cita o reparación..."
                        />
                    </div>

                    <div className="pt-4 flex justify-end gap-3 border-t border-border">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="px-5 py-2.5 rounded-xl bg-muted text-foreground font-medium hover:bg-muted/80 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                        >
                            {editingRecord ? 'Guardar Cambios' : 'Agendar Cita'}
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
                    <div className="flex items-center gap-4 bg-red-50 p-4 rounded-xl text-red-800 border border-red-100">
                        <Trash2 className="h-6 w-6" />
                        <p className="text-sm font-medium">Esta acción no se puede deshacer.</p>
                    </div>
                    <p className="text-muted-foreground text-center">
                        ¿Estás seguro de que quieres cancelar y eliminar esta cita?
                    </p>
                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            onClick={() => setIsDeleteModalOpen(false)}
                            className="px-4 py-2 rounded-lg bg-muted font-medium hover:bg-muted/80 text-foreground transition-colors"
                        >
                            Volver
                        </button>
                        <button
                            onClick={executeDelete}
                            className="px-4 py-2 rounded-lg bg-red-600 font-medium hover:bg-red-700 text-white transition-colors shadow-sm"
                        >
                            Eliminar
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
