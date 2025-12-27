import { cn } from '@/lib/utils';
import { MATERIAL_STATUS_LABELS } from '@/types';

interface StatusBadgeProps {
    status: string;
    className?: string;
    options?: { label: string; value: string }[];
    onChange?: (value: string) => void;
}

const statusStyles: Record<string, string> = {
    // General / Common
    active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    inactive: 'bg-slate-100 text-slate-700 border-slate-200',

    // Incidents Priority
    low: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    medium: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    high: 'bg-orange-50 text-orange-700 border-orange-200',
    critical: 'bg-red-50 text-red-700 border-red-200',

    // Incident Status
    open: 'bg-blue-50 text-blue-700 border-blue-200',
    in_progress: 'bg-amber-50 text-amber-700 border-amber-200 shadow-sm shadow-amber-100',
    resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    closed: 'bg-slate-100 text-slate-500 border-slate-200 opacity-80',

    // Vehicles
    maintenance: 'bg-red-50 text-red-700 border-red-100',
    rented: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    retired: 'bg-gray-100 text-gray-500 border-gray-200',

    // Inventory
    available: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    assigned: 'bg-blue-100 text-blue-700 border-blue-200',
    repair: 'bg-orange-100 text-orange-700 border-orange-200',
    lost: 'bg-red-100 text-red-700 border-red-200',

    // Material Conditions
    pending_management: 'bg-slate-50 text-slate-600 border-slate-200',
    new_functional: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    working_urgent_change: 'bg-amber-50 text-amber-700 border-amber-200',
    totally_broken: 'bg-rose-50 text-rose-700 border-rose-200',
    ordered: 'bg-blue-50 text-blue-700 border-blue-200',
};

export function StatusBadge({ status, className, options, onChange }: StatusBadgeProps) {
    const safeStatus = status || 'unknown';
    const styles = statusStyles[safeStatus.toLowerCase()] || 'bg-gray-100 text-gray-700 border-gray-200';
    const isEditable = options && onChange && options.length > 0;

    return (
        <div className="relative inline-block">
            <span
                className={cn(
                    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize whitespace-nowrap',
                    styles,
                    isEditable ? 'pr-2' : '',
                    className
                )}
            >
                {MATERIAL_STATUS_LABELS[safeStatus.toLowerCase()] || safeStatus.replace('_', ' ')}
                {isEditable && (
                    <span className="ml-1 opacity-50 text-[10px]">▼</span>
                )}
            </span>

            {isEditable && (
                <select
                    value={safeStatus}
                    onChange={(e) => onChange(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer text-sm"
                    aria-label="Change status"
                >
                    {options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
            )}
        </div>
    );
}
