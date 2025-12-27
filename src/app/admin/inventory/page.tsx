'use client';

import { useState, useEffect, useRef } from 'react';
import {
    Plus,
    Edit,
    Trash2,
    Music,
    Box,
    Mic,
    Cable,
    Car,
    Warehouse as WarehouseIcon,
    AlertTriangle,
    Clock,
    ShieldCheck,
    CheckCircle2,
    RotateCcw
} from 'lucide-react';
import { DataTable, Column } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import { addItem, updateItem, deleteItem, subscribeToCollection, getWarehouses, getVehicles } from '@/services/FirebaseService';
import { InventoryItem, Warehouse, Vehicle, MaterialCondition, MATERIAL_STATUS_LABELS, INVENTORY_CATEGORY_LABELS, INVENTORY_STATUS_LABELS } from '@/types';
import { StatusAuditor } from '@/components/admin/inventory/StatusAuditor';

interface LocationCellProps {
    item: InventoryItem;
    vehicles: Vehicle[];
    warehouses: Warehouse[];
    onEdit: (item: InventoryItem) => void;
    onReportBroken: (item: InventoryItem, index: number) => void;
}

const LocationCell = ({ item, vehicles, warehouses, onEdit, onReportBroken }: LocationCellProps) => {
    const [hoverPos, setHoverPos] = useState<{ top: number; left: number } | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const locations = item.locations || [];
    const count = locations.length;

    // Legacy fallback
    if (count === 0) {
        if (item.vehicleId) {
            return <span className="text-sm text-muted-foreground">1 Ubicación (Legacy)</span>;
        }
        if (item.warehouseId) {
            return <span className="text-sm text-muted-foreground">1 Ubicación (Legacy)</span>;
        }
        return <span className="text-sm text-muted-foreground italic">Sin asignar</span>;
    }

    const handleMouseEnter = (e: React.MouseEvent) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        const rect = e.currentTarget.getBoundingClientRect();
        setHoverPos({
            top: rect.top,
            left: rect.left
        });
    };

    const handleMouseLeave = () => {
        timeoutRef.current = setTimeout(() => {
            setHoverPos(null);
        }, 150); // 150ms delay to allow moving to popup
    };

    return (
        <>
            <div
                className="relative inline-block"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                <div className="flex items-center gap-2 cursor-help">
                    <span className="inline-flex items-center justify-center bg-secondary hover:bg-secondary/80 transition-colors px-2.5 py-1 rounded-md text-sm font-medium border border-border">
                        <Box className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                        {count} {count === 1 ? 'Ubicación' : 'Ubicaciones'}
                    </span>
                </div>
            </div>

            {/* Fixed Portal-like Tooltip */}
            {hoverPos && (
                <div
                    className="fixed z-[9999] w-72 bg-popover text-popover-foreground rounded-lg border shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-75"
                    style={{
                        top: hoverPos.top - 8,
                        left: hoverPos.left,
                        transform: 'translateY(-100%)'
                    }}
                    onMouseEnter={() => {
                        if (timeoutRef.current) {
                            clearTimeout(timeoutRef.current);
                            timeoutRef.current = null;
                        }
                    }}
                    onMouseLeave={handleMouseLeave}
                >
                    <div className="px-3 py-2 border-b bg-muted/40">
                        <p className="font-medium text-xs text-muted-foreground uppercase tracking-wider">Detalle de Ubicaciones</p>
                    </div>
                    <div className="p-1 pb-2 bg-background">
                        {locations.map((loc, idx) => {
                            let icon = <Box className="w-3.5 h-3.5 text-muted-foreground" />;
                            let name = 'Desconocido';
                            let iconBg = 'bg-gray-100 dark:bg-zinc-800';

                            if (loc.type === 'warehouse') {
                                icon = <WarehouseIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />;
                                iconBg = 'bg-blue-50 dark:bg-blue-900/20';
                                const w = warehouses.find(w => w.id === loc.id);
                                name = w ? w.name : 'Almacén desconocido';
                            } else if (loc.type === 'vehicle') {
                                icon = <Car className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />;
                                iconBg = 'bg-emerald-50 dark:bg-emerald-900/20';
                                const v = vehicles.find(v => v.id === loc.id);
                                name = v ? `${v.brand} ${v.model} (${v.plate})` : 'Vehículo desconocido';
                            }

                            const statusConfig: Record<string, { label: string, color: string, icon: any }> = {
                                pending_management: { label: MATERIAL_STATUS_LABELS.pending_management, color: 'text-slate-600 bg-slate-50 border-slate-200', icon: Clock },
                                new_functional: { label: MATERIAL_STATUS_LABELS.new_functional, color: 'text-emerald-700 bg-emerald-50 border-emerald-200', icon: CheckCircle2 },
                                working_urgent_change: { label: MATERIAL_STATUS_LABELS.working_urgent_change, color: 'text-amber-700 bg-amber-50 border-amber-200', icon: AlertTriangle },
                                totally_broken: { label: MATERIAL_STATUS_LABELS.totally_broken, color: 'text-rose-700 bg-rose-50 border-rose-200', icon: AlertTriangle },
                                ordered: { label: MATERIAL_STATUS_LABELS.ordered, color: 'text-blue-700 bg-blue-50 border-blue-200', icon: Clock },
                                resolved: { label: MATERIAL_STATUS_LABELS.resolved, color: 'text-teal-700 bg-teal-50 border-teal-200', icon: CheckCircle2 },
                                // Legacy
                                new: { label: MATERIAL_STATUS_LABELS.new, color: 'text-emerald-700 bg-emerald-50 border-emerald-200', icon: CheckCircle2 },
                                broken: { label: MATERIAL_STATUS_LABELS.broken, color: 'text-rose-700 bg-rose-50 border-rose-200', icon: AlertTriangle },
                            };

                            const currentStatus = loc.status || 'new_functional';
                            const config = statusConfig[currentStatus as string] || statusConfig.new_functional;
                            const StatusIcon = config.icon;

                            return (
                                <div
                                    key={idx}
                                    onClick={() => onEdit(item)}
                                    className={`flex items-center justify-between px-2 py-1.5 rounded-md group/item transition-colors cursor-pointer hover:bg-muted/50`}
                                >
                                    <div className="flex items-center gap-2 overflow-hidden flex-1">
                                        <div className={`flex-shrink-0 p-1 rounded-md ${config.color.split(' ').slice(1).join(' ')}`}>
                                            <StatusIcon className={`w-3.5 h-3.5 ${config.color.split(' ')[0]}`} />
                                        </div>
                                        <div className="flex flex-col overflow-hidden">
                                            <span className={`truncate text-xs font-medium text-foreground`} title={name}>{name}</span>
                                            <span className={`text-[9px] font-bold uppercase leading-none ${config.color.split(' ')[0]}`}>{config.label}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1 pl-2">
                                        <span className={`flex-shrink-0 font-mono text-[10px] items-center justify-center border px-1.5 py-0.5 rounded ${config.color}`}>
                                            x{loc.quantity}
                                        </span>
                                        {currentStatus !== 'totally_broken' && currentStatus !== 'working_urgent_change' && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onReportBroken(item, idx);
                                                }}
                                                className="opacity-0 group-hover/item:opacity-100 p-1 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded transition-all"
                                                title="Marcar como roto"
                                            >
                                                <AlertTriangle className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </>
    );
};

export default function InventoryPage() {
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(true);

    // Delete Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);

    // Break Item Modal State
    const [isBreakModalOpen, setIsBreakModalOpen] = useState(false);
    const [itemToBreak, setItemToBreak] = useState<InventoryItem | null>(null);
    const [breakIndex, setBreakIndex] = useState<number>(-1);

    // Auditor State
    const [isAuditorOpen, setIsAuditorOpen] = useState(false);

    // Modal & Form
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
    const [formData, setFormData] = useState<Partial<InventoryItem>>({
        name: '',
        sku: '',
        category: 'sound',
        status: 'available',
        locations: [],
        quantity: 1
    });

    // For the "Add Assignment" section in the modal
    const [newLocType, setNewLocType] = useState<'warehouse' | 'vehicle'>('warehouse');
    const [newLocId, setNewLocId] = useState<string>('');
    const [newLocQty, setNewLocQty] = useState<number>(1);
    const [newLocStatus, setNewLocStatus] = useState<MaterialCondition>('new_functional');

    useEffect(() => {
        const unsubscribe = subscribeToCollection<InventoryItem>('inventory', (data) => {
            setInventory(data);
            setLoading(false);
        });

        getWarehouses().then(setWarehouses);
        getVehicles().then(setVehicles);

        return () => unsubscribe();
    }, []);

    const handleOpenModal = (item?: InventoryItem) => {
        if (item) {
            setEditingItem(item);

            // Migrate legacy data to locations if needed
            let currentLocations = item.locations || [];
            if (currentLocations.length === 0) {
                if (item.warehouseId) {
                    currentLocations = [{ type: 'warehouse', id: item.warehouseId, quantity: item.quantity }];
                } else if (item.vehicleId) {
                    currentLocations = [{ type: 'vehicle', id: item.vehicleId, quantity: item.quantity }];
                }
            }

            setFormData({ ...item, locations: currentLocations });
        } else {
            setEditingItem(null);
            setFormData({
                name: '',
                sku: '',
                category: 'sound',
                status: 'available',
                locations: [],
                quantity: 1
            });
        }
        // Reset "New Location" inputs
        setNewLocType('warehouse');
        setNewLocId('');
        setNewLocQty(1);
        setIsModalOpen(true);
    };

    const confirmDelete = (id: string) => {
        setItemToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const executeDelete = async () => {
        if (itemToDelete) {
            await deleteItem('inventory', itemToDelete);
            setIsDeleteModalOpen(false);
            setItemToDelete(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Ensure we save the locations array
            // We can also clear the legacy fields to avoid confusion, or keep them sync with the first location
            const dataToSave: any = {
                ...formData,
                warehouseId: null, // Clear legacy
                vehicleId: null    // Clear legacy
            };

            // Optional: Populate legacy fields based on primary location for backward compat 
            // (Skipping for now to clean up schema, but if other parts of app rely on valid ID, we might need to patch)

            if (editingItem && editingItem.id) {
                await updateItem('inventory', editingItem.id, dataToSave);
            } else {
                await addItem('inventory', dataToSave);
            }
            setIsModalOpen(false);
        } catch (error) {
            console.error('Error saving inventory:', error);
            alert('Error al guardar el ítem');
        }
    };

    const addLocation = () => {
        if (!newLocId || newLocQty <= 0) return;

        const currentLocs = formData.locations || [];
        const currentAssigned = currentLocs.reduce((acc, l) => acc + l.quantity, 0);
        const totalQty = formData.quantity || 0;
        const remaining = totalQty - currentAssigned;

        if (newLocQty > remaining) {
            alert(`No puedes asignar más de lo disponible. Quedan ${remaining} unidades por asignar.`);
            return;
        }

        // Check if already exists
        const exists = currentLocs.find(l => l.type === newLocType && l.id === newLocId);
        if (exists) {
            alert('Esta ubicación ya está añadida. Modifica la existente.');
            return;
        }

        const updatedLocs = [...currentLocs, { type: newLocType, id: newLocId, quantity: newLocQty, status: newLocStatus }];
        setFormData({ ...formData, locations: updatedLocs });

        // Reset inputs
        setNewLocId('');
        // Auto-set next quantity to 1 as requested
        setNewLocQty(1);
    };

    const removeLocation = (index: number) => {
        const currentLocs = formData.locations || [];
        const updated = [...currentLocs];
        updated.splice(index, 1);
        setFormData({ ...formData, locations: updated });
    };



    const handleReportBroken = (item: InventoryItem, index: number) => {
        setItemToBreak(item);
        setBreakIndex(index);
        setIsBreakModalOpen(true);
    };

    const confirmBreak = async () => {
        if (!itemToBreak || breakIndex === -1) return;

        const locations = [...(itemToBreak.locations || [])];
        const target = locations[breakIndex];

        if (!target) return;

        if (target.quantity > 1) {
            // Split
            target.quantity -= 1;
            locations.push({
                ...target,
                quantity: 1,
                status: 'totally_broken'
            });
        } else {
            // Mark entire stack as broken
            target.status = 'totally_broken';
        }

        try {
            await updateItem('inventory', itemToBreak.id!, { locations });
            setIsBreakModalOpen(false);
            setItemToBreak(null);
            setBreakIndex(-1);
        } catch (e) {
            console.error(e);
            alert('Error al reportar rotura');
        }
    };

    const getIcon = (category: string) => {
        switch (category) {
            case 'sound': return <Mic className="h-4 w-4 text-primary" />;
            case 'cables': return <Cable className="h-4 w-4 text-gray-500" />;
            case 'lighting': return <Box className="h-4 w-4 text-amber-500" />;
            case 'instruments': return <Music className="h-4 w-4 text-purple-500" />;
            default: return <Music className="h-4 w-4 text-primary" />;
        }
    };

    const columns: Column<InventoryItem>[] = [
        {
            key: 'category',
            label: 'Cat',
            render: (i) => (
                <div className="flex items-center gap-2">
                    {getIcon(i.category)}
                    {INVENTORY_CATEGORY_LABELS[i.category] || i.category}
                </div>
            )
        },
        { key: 'name', label: 'Item', sortable: true },
        {
            key: 'sku',
            label: 'SKU',
            render: (i) => <span className="font-mono text-xs bg-muted px-2 py-1 rounded">{i.sku}</span>,
            sortable: true
        },
        {
            key: 'quantity',
            label: 'Cant.',
            sortable: true,
            render: (i) => {
                const totalAssigned = (i.locations || []).reduce((acc, l) => acc + l.quantity, 0);
                const unassigned = i.quantity - totalAssigned;

                return (
                    <div className="flex flex-col">
                        <span className="font-medium">{i.quantity} Total</span>
                        {unassigned > 0 ? (
                            <span className="text-xs text-orange-600 font-medium">({unassigned} sin asignar)</span>
                        ) : (
                            <span className="text-xs text-green-600 font-medium">(Todo asignado)</span>
                        )}
                    </div>
                );
            }
        },
        {
            key: 'warehouseId',
            label: 'Ubicación',
            render: (i) => <LocationCell item={i} vehicles={vehicles} warehouses={warehouses} onEdit={handleOpenModal} onReportBroken={handleReportBroken} />
        },
        {
            key: 'status',
            label: 'Estado',
            sortable: true,
            render: (i) => (
                <StatusBadge
                    status={i.status}
                    options={[
                        { label: INVENTORY_STATUS_LABELS.available, value: 'available' },
                        { label: INVENTORY_STATUS_LABELS.assigned, value: 'assigned' },
                        { label: INVENTORY_STATUS_LABELS.repair, value: 'repair' },
                        { label: INVENTORY_STATUS_LABELS.lost, value: 'lost' }
                    ]}
                    onChange={(newStatus) => {
                        if (i.id) {
                            updateItem('inventory', i.id, { status: newStatus as any });
                        }
                    }}
                />
            )
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
                    <h1 className="text-3xl font-bold tracking-tight">Inventario Musical</h1>
                    <p className="text-muted-foreground mt-2">Control de instrumentos, sonido e iluminación.</p>
                </div>
                <button
                    onClick={() => setIsAuditorOpen(true)}
                    className="inline-flex items-center justify-center rounded-lg bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 border border-amber-200 shadow-sm transition-colors hover:bg-amber-100"
                >
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    Auditor de Estados
                </button>
            </div>

            <DataTable
                columns={columns}
                data={inventory}
                isLoading={loading}
                title="Listado de Material"
                searchPlaceholder="Buscar por nombre, SKU..."
                breakpoint="2xl"
                mobileItem={(item) => (
                    <div className="bg-card p-4 rounded-xl border border-border shadow-sm space-y-4">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                    {getIcon(item.category)}
                                </div>
                                <div>
                                    <h3 className="font-semibold text-foreground line-clamp-1">{item.name}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[10px] text-muted-foreground border border-border">
                                            {item.sku}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <StatusBadge
                                status={item.status}
                                options={[
                                    { label: INVENTORY_STATUS_LABELS.available, value: 'available' },
                                    { label: INVENTORY_STATUS_LABELS.assigned, value: 'assigned' },
                                    { label: INVENTORY_STATUS_LABELS.repair, value: 'repair' },
                                    { label: INVENTORY_STATUS_LABELS.lost, value: 'lost' }
                                ]}
                                onChange={(newStatus) => {
                                    if (item.id) {
                                        updateItem('inventory', item.id, { status: newStatus as any });
                                    }
                                }}
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-2 py-3 border-y border-border/50">
                            <div className="space-y-1 text-center border-r border-border/50">
                                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Total</span>
                                <p className="text-sm font-bold">{item.quantity}</p>
                            </div>
                            <div className="space-y-1 text-center border-r border-border/50">
                                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Asignado</span>
                                <p className="text-sm font-medium text-blue-600">
                                    {(item.locations || []).reduce((acc, l) => acc + l.quantity, 0)}
                                </p>
                            </div>
                            <div className="space-y-1 text-center">
                                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Libre</span>
                                <p className={`text-sm font-medium ${(item.quantity - (item.locations || []).reduce((acc, l) => acc + l.quantity, 0)) > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                                    {item.quantity - (item.locations || []).reduce((acc, l) => acc + l.quantity, 0)}
                                </p>
                            </div>
                        </div>

                        {/* Location Preview */}
                        {(item.locations || []).length > 0 && (
                            <div className="text-xs space-y-2">
                                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Ubicaciones</span>
                                <div className="flex flex-wrap gap-1.5">
                                    {(item.locations || []).slice(0, 3).map((loc, i) => (
                                        <span key={i} className="inline-flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded border border-border/50 max-w-full">
                                            {loc.type === 'warehouse' ? <WarehouseIcon className="w-3 h-3 text-blue-500" /> : <Car className="w-3 h-3 text-emerald-500" />}
                                            <span className="truncate max-w-[120px]">
                                                {loc.type === 'warehouse'
                                                    ? warehouses.find(w => w.id === loc.id)?.name
                                                    : vehicles.find(v => v.id === loc.id)?.plate + ' - ' + vehicles.find(v => v.id === loc.id)?.model
                                                }
                                            </span>
                                            <span className="text-[10px] font-mono text-muted-foreground ml-0.5 px-1 bg-background rounded-sm border">
                                                {loc.quantity}
                                            </span>
                                        </span>
                                    ))}
                                    {(item.locations || []).length > 3 && (
                                        <span className="inline-flex items-center px-2 py-1 rounded bg-muted text-muted-foreground text-[10px] border border-border">
                                            +{item.locations!.length - 3} más
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
                            <button
                                onClick={(e) => { e.stopPropagation(); handleOpenModal(item); }}
                                className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 text-xs font-medium"
                            >
                                <Edit className="h-3.5 w-3.5" />
                                <span>Editar</span>
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); if (item.id) confirmDelete(item.id); }}
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
                        Nuevo Item
                    </button>
                }
            />

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingItem ? 'Editar Item' : 'Nuevo Item'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Nombre</label>
                            <input
                                required
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                placeholder="Micro Shure SM58"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">SKU / Referencia</label>
                            <input
                                required
                                value={formData.sku}
                                onChange={e => setFormData({ ...formData, sku: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                placeholder="MIC-001"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Categoría</label>
                            <select
                                value={formData.category}
                                onChange={e => setFormData({ ...formData, category: e.target.value as any })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                            >
                                <option value="sound">{INVENTORY_CATEGORY_LABELS.sound}</option>
                                <option value="lighting">{INVENTORY_CATEGORY_LABELS.lighting}</option>
                                <option value="instruments">{INVENTORY_CATEGORY_LABELS.instruments}</option>
                                <option value="cables">{INVENTORY_CATEGORY_LABELS.cables}</option>
                                <option value="misc">{INVENTORY_CATEGORY_LABELS.misc}</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Cantidad</label>
                            <input
                                type="number"
                                min="1"
                                value={formData.quantity}
                                onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                            />
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
                                <option value="available">{INVENTORY_STATUS_LABELS.available}</option>
                                <option value="assigned">{INVENTORY_STATUS_LABELS.assigned}</option>
                                <option value="repair">{INVENTORY_STATUS_LABELS.repair}</option>
                                <option value="lost">{INVENTORY_STATUS_LABELS.lost}</option>
                            </select>
                        </div>
                        <div className="col-span-2 space-y-3 border-t pt-4">
                            <label className="text-sm font-medium">Distribución de Ubicaciones</label>

                            {/* Summary Stats */}
                            <div className="text-xs text-muted-foreground mb-2">
                                Total: {formData.quantity} |
                                Asignado: {(formData.locations || []).reduce((acc, l) => acc + l.quantity, 0)} |
                                <span className={((formData.quantity || 0) - (formData.locations || []).reduce((acc, l) => acc + l.quantity, 0)) < 0 ? "text-red-500 font-bold" : "text-green-600"}>
                                    {' '}Sin asignar: {(formData.quantity || 0) - (formData.locations || []).reduce((acc, l) => acc + l.quantity, 0)}
                                </span>
                            </div>

                            {/* Current Locations List */}
                            <div className="space-y-2 mb-4">
                                {(formData.locations || []).map((loc, idx) => {
                                    const locName = loc.type === 'warehouse'
                                        ? warehouses.find(w => w.id === loc.id)?.name
                                        : vehicles.find(v => v.id === loc.id)?.plate + ' - ' + vehicles.find(v => v.id === loc.id)?.model;

                                    return (
                                        <div key={idx} className="flex items-center justify-between bg-muted/50 p-2 rounded text-sm">
                                            <div className="flex flex-col">
                                                <span>{loc.type === 'warehouse' ? '🏭' : '🚗'} {locName} (Cant: {loc.quantity})</span>
                                                <span className="text-[10px] uppercase font-bold text-muted-foreground italic">
                                                    {loc.status === 'new_functional' ? 'Nuevo o funcional' :
                                                        loc.status === 'working_urgent_change' ? 'Urge cambio' :
                                                            loc.status === 'ordered' ? 'Pedido' :
                                                                loc.status === 'totally_broken' ? 'Roto' :
                                                                    loc.status === 'pending_management' ? 'Pendiente' :
                                                                        loc.status === 'resolved' ? 'Resuelto' : 'Normal'}
                                                </span>
                                            </div>
                                            <button type="button" onClick={() => removeLocation(idx)} className="text-red-500 hover:bg-red-50 p-1 rounded">
                                                <Trash2 className="h-3 w-3" />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Add New Location Controls */}
                            <div className="flex gap-2 items-end bg-gray-50 p-3 rounded-lg border">
                                <div className="space-y-1 flex-1">
                                    <label className="text-xs font-medium">Tipo</label>
                                    <select
                                        value={newLocType}
                                        onChange={e => { setNewLocType(e.target.value as any); setNewLocId(''); }}
                                        className="w-full text-sm px-2 py-1 border rounded"
                                    >
                                        <option value="warehouse">Almacén</option>
                                        <option value="vehicle">Vehículo</option>
                                    </select>
                                </div>
                                <div className="space-y-1 flex-[1]">
                                    <label className="text-xs font-medium">Estado</label>
                                    <select
                                        value={newLocStatus}
                                        onChange={e => setNewLocStatus(e.target.value as MaterialCondition)}
                                        className="w-full text-sm px-2 py-1 border rounded"
                                    >
                                        <option value="pending_management">{MATERIAL_STATUS_LABELS.pending_management}</option>
                                        <option value="new_functional">{MATERIAL_STATUS_LABELS.new_functional}</option>
                                        <option value="working_urgent_change">{MATERIAL_STATUS_LABELS.working_urgent_change}</option>
                                        <option value="totally_broken">{MATERIAL_STATUS_LABELS.totally_broken}</option>
                                        <option value="ordered">{MATERIAL_STATUS_LABELS.ordered}</option>
                                        <option value="resolved">{MATERIAL_STATUS_LABELS.resolved}</option>
                                    </select>
                                </div>
                                <div className="space-y-1 flex-[2]">
                                    <label className="text-xs font-medium">Ubicación</label>
                                    <select
                                        value={newLocId}
                                        onChange={e => setNewLocId(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                addLocation();
                                            }
                                        }}
                                        className="w-full text-sm px-2 py-1 border rounded"
                                    >
                                        <option value="">Seleccionar...</option>
                                        {newLocType === 'warehouse'
                                            ? warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)
                                            : vehicles.map(v => <option key={v.id} value={v.id}>{v.brand} {v.model} - {v.plate}</option>)
                                        }
                                    </select>
                                </div>
                                <div className="space-y-1 w-20">
                                    <label className="text-xs font-medium">Cant.</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={newLocQty}
                                        onChange={e => setNewLocQty(parseInt(e.target.value))}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                addLocation();
                                            }
                                        }}
                                        className="w-full text-sm px-2 py-1 border rounded"
                                    />
                                </div>
                                <button
                                    type="button"
                                    disabled={!newLocId}
                                    onClick={addLocation}
                                    className="px-3 py-1.5 bg-primary text-primary-foreground text-sm rounded shadow disabled:opacity-50"
                                >
                                    <Plus className="h-4 w-4" />
                                </button>
                                {/* Break Item Confirmation Modal */}

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
                            {editingItem ? 'Guardar Cambios' : 'Crear Item'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Break Item Confirmation Modal */}
            <Modal
                isOpen={isBreakModalOpen}
                onClose={() => setIsBreakModalOpen(false)}
                title="Reportar Rotura"
                className="max-w-sm"
            >
                <div className="space-y-4">
                    <div className="flex items-center gap-4 bg-orange-50 p-4 rounded-lg text-orange-800">
                        <AlertTriangle className="h-6 w-6" />
                        <div className="text-sm font-medium">
                            <p>Vas a marcar este item como ROTO.</p>
                            <span className="text-xs text-orange-700 font-normal">Si hay varias unidades, se separará sólo una.</span>
                        </div>
                    </div>
                    <p className="text-gray-600 text-sm">
                        Esta acción indicará que el material necesita reparación o sustitución. ¿Continuar?
                    </p>
                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            onClick={() => setIsBreakModalOpen(false)}
                            className="px-4 py-2 rounded-lg bg-gray-100 font-medium hover:bg-gray-200 text-gray-700 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={confirmBreak}
                            className="px-4 py-2 rounded-lg bg-orange-600 font-medium hover:bg-orange-700 text-white transition-colors"
                        >
                            Confirmar Rotura
                        </button>
                    </div>
                </div>
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
                        ¿Estás seguro de que quieres eliminar este ítem permanentemente?
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
                            Eliminar Ítem
                        </button>
                    </div>
                </div>
            </Modal>
            {/* Status Auditor Modal */}
            <Modal
                isOpen={isAuditorOpen}
                onClose={() => setIsAuditorOpen(false)}
                title="Auditor de Estados de Material"
            >
                <StatusAuditor
                    items={inventory}
                    onClose={() => setIsAuditorOpen(false)}
                    onUpdate={() => { }} // It subscribes to data, so it will update automatically
                />
            </Modal>
        </div>
    );
}
