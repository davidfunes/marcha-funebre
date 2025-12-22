'use client';

import {
    AlertTriangle,
    Eye,
    Edit,
    AlertCircle,
    Calendar,
    Clock,
    User as UserIcon,
    MapPin,
    Camera,
    Package,
    Music
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Incident, Vehicle, User, InventoryItem } from '@/types';
import { Timestamp } from 'firebase/firestore';
import { getFullName, getUserInitials } from '@/utils/userUtils';

interface IncidentDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    incident: Incident | null;
    vehicles: Vehicle[];
    users: User[];
    inventory: InventoryItem[];
    onEdit?: (incident: Incident) => void;
}

export function IncidentDetailsModal({
    isOpen,
    onClose,
    incident,
    vehicles,
    users,
    inventory,
    onEdit
}: IncidentDetailsModalProps) {
    if (!incident) return null;

    // Helper functions (duplicated from page for self-containment/simplicity in this component)
    const getVehicleName = (id: string) => {
        const v = vehicles.find(v => v.id === id);
        return v ? `${v.brand} ${v.model} (${v.plate})` : 'Vehículo desconocido';
    };

    const reporter = users.find(u => u.id === incident.reportedByUserId);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Detalles de la Incidencia"
            className="max-w-2xl px-0 sm:px-0"
        >
            <div className="flex flex-col max-h-[85vh]">
                {/* Header con Estado y Prioridad */}
                <div className="px-6 pb-6 border-b border-border/50">
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                        <StatusBadge status={incident.status || 'open'} />
                        <StatusBadge status={incident.priority || 'medium'} />
                    </div>
                    <h2 className="text-2xl font-bold text-foreground leading-tight">
                        {incident.title}
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
                                {incident.description || 'Sin descripción detallada.'}
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
                                <p className="font-semibold text-lg">{getVehicleName(incident.vehicleId || '')}</p>
                                <p className="text-sm text-muted-foreground">ID: {incident.vehicleId}</p>
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
                                    {getUserInitials(reporter)}
                                </div>
                                <div>
                                    <p className="font-semibold">{getFullName(reporter)}</p>
                                    <p className="text-xs text-muted-foreground">Colaborador</p>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Material (Si aplica) */}
                    {incident.inventoryItemId && (
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
                                        {inventory.find(inv => inv.id === incident.inventoryItemId)?.name || 'Cargando...'}
                                    </p>
                                    <p className="text-sm text-purple-600/70 dark:text-purple-400/70">
                                        Estado reportado: {incident.status === 'resolved' ? 'Reparado' : 'Averiado'}
                                    </p>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* Imágenes (Si hay) */}
                    {incident.images && incident.images.length > 0 && (
                        <section className="space-y-3">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                <Camera className="h-4 w-4" />
                                Evidencias Fotográficas
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                                {incident.images.map((img, idx) => (
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
                            <span>Creado: {incident.createdAt instanceof Timestamp ? incident.createdAt.toDate().toLocaleString() : 'Recientemente'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3" />
                            <span>Actualizado: {incident.updatedAt instanceof Timestamp ? incident.updatedAt.toDate().toLocaleString() : 'Recientemente'}</span>
                        </div>
                    </section>
                </div>

                {/* Footer con Botones de Acción */}
                <div className="p-6 bg-muted/20 border-t border-border/50 flex flex-wrap justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 rounded-xl bg-background border border-border font-bold text-sm hover:bg-muted transition-colors"
                    >
                        Cerrar
                    </button>
                    {onEdit && (
                        <button
                            onClick={() => {
                                onClose();
                                onEdit(incident);
                            }}
                            className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-all shadow-sm flex items-center gap-2"
                        >
                            <Edit className="h-4 w-4" />
                            Editar Incidencia
                        </button>
                    )}
                </div>
            </div>
        </Modal>
    );
}
