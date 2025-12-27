'use client';

import { useState } from 'react';
import { InventoryItem, MaterialCondition } from '@/types';
import { updateItem } from '@/services/FirebaseService';
import { ShieldCheck, AlertCircle, RefreshCcw, CheckCircle2 } from 'lucide-react';

interface StatusAuditorProps {
    items: InventoryItem[];
    onClose: () => void;
    onUpdate: () => void;
}

export const StatusAuditor = ({ items, onClose, onUpdate }: StatusAuditorProps) => {
    const [isUpdating, setIsUpdating] = useState(false);

    // Filter items that have at least one location with a legacy or missing status
    const legacyStatuses = ['new', 'broken', 'ok', undefined];
    const itemsToAudit = items.filter(item =>
        (item.locations || []).some(loc => legacyStatuses.includes(loc.status as any))
    );

    const handleAutoMigrate = async () => {
        setIsUpdating(true);
        try {
            for (const item of itemsToAudit) {
                const newLocations = (item.locations || []).map(loc => {
                    let newStatus: MaterialCondition = loc.status as any;
                    if ((loc.status as any) === 'new' || (loc.status as any) === 'ok' || !loc.status) {
                        newStatus = 'new_functional';
                    } else if ((loc.status as any) === 'broken') {
                        newStatus = 'totally_broken';
                    }
                    return { ...loc, status: newStatus };
                });
                await updateItem('inventory', item.id!, { locations: newLocations });
            }
            onUpdate();
            onClose();
        } catch (error) {
            console.error("Error migrating statuses:", error);
            alert("Error al migrar los estados. Revisa la consola.");
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-sm">
                    <p className="font-bold text-amber-900">Auditoría Requerida</p>
                    <p className="text-amber-700 mt-1">
                        Se han detectado {itemsToAudit.length} materiales con estados antiguos o sin definir.
                        Para que el nuevo sistema funcione correctamente, es necesario actualizarlos.
                    </p>
                </div>
            </div>

            <div className="space-y-3">
                {itemsToAudit.map(item => (
                    <div key={item.id} className="p-3 bg-muted/30 rounded-lg border border-border flex items-center justify-between">
                        <div>
                            <p className="font-medium text-sm">{item.name}</p>
                            <p className="text-xs text-muted-foreground">{item.sku}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                            {item.locations?.map((loc, idx) => (
                                <span key={idx} className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-mono">
                                    {loc.status || 'undefined'} → new_functional
                                </span>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <div className="pt-4 flex gap-3">
                <button
                    onClick={onClose}
                    className="flex-1 py-2.5 rounded-xl bg-muted text-foreground font-medium hover:bg-muted/80 transition-colors"
                >
                    Cerrar
                </button>
                <button
                    onClick={handleAutoMigrate}
                    disabled={isUpdating || itemsToAudit.length === 0}
                    className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50"
                >
                    {isUpdating ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                    Migrar Todo Automáticamente
                </button>
            </div>
        </div>
    );
};
