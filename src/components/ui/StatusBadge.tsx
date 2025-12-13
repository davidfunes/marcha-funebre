import { cn } from '@/lib/utils';

interface StatusBadgeProps {
    status: string;
    className?: string;
}

const statusStyles: Record<string, string> = {
    // General / Common
    active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    inactive: 'bg-slate-100 text-slate-700 border-slate-200',

    // Incidents
    low: 'bg-blue-100 text-blue-700 border-blue-200',
    medium: 'bg-amber-100 text-amber-700 border-amber-200',
    high: 'bg-orange-100 text-orange-700 border-orange-200',
    critical: 'bg-red-100 text-red-700 border-red-200',

    open: 'bg-blue-50 text-blue-700 border-blue-100',
    in_progress: 'bg-purple-50 text-purple-700 border-purple-100',
    resolved: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    closed: 'bg-slate-50 text-slate-600 border-slate-100',

    // Vehicles
    maintenance: 'bg-red-50 text-red-700 border-red-100',
    rented: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    retired: 'bg-gray-100 text-gray-500 border-gray-200',

    // Inventory
    available: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    assigned: 'bg-blue-100 text-blue-700 border-blue-200',
    repair: 'bg-orange-100 text-orange-700 border-orange-200',
    lost: 'bg-red-100 text-red-700 border-red-200',
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
    const safeStatus = status || 'unknown';
    const styles = statusStyles[safeStatus.toLowerCase()] || 'bg-gray-100 text-gray-700 border-gray-200';

    return (
        <span
            className={cn(
                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize',
                styles,
                className
            )}
        >
            {safeStatus.replace('_', ' ')}
        </span>
    );
}
