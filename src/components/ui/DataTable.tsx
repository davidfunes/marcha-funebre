'use client';

import { useState, useMemo } from 'react';
import {
    ChevronDown,
    ChevronUp,
    Search,
    ChevronLeft,
    ChevronRight,
    MoreHorizontal
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Column<T> {
    key: keyof T | 'actions';
    label: string;
    render?: (item: T) => React.ReactNode;
    sortable?: boolean;
}

interface DataTableProps<T> {
    columns: Column<T>[];
    data: T[];
    title?: string;
    actionButton?: React.ReactNode;
    searchPlaceholder?: string;
    onRowClick?: (item: T) => void;
    isLoading?: boolean;
    mobileItem?: (item: T) => React.ReactNode;
}

export function DataTable<T extends { id?: string }>({
    columns,
    data,
    title,
    actionButton,
    searchPlaceholder = "Buscar...",
    onRowClick,
    isLoading,
    mobileItem
}: DataTableProps<T>) {
    const [sortConfig, setSortConfig] = useState<{ key: keyof T; direction: 'asc' | 'desc' } | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;


    // Sorting
    const sortedData = useMemo(() => {
        let sortableItems = [...data];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                const valA = a[sortConfig.key];
                const valB = b[sortConfig.key];

                if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [data, sortConfig]);

    // Filtering
    const filteredData = useMemo(() => {
        return sortedData.filter(item =>
            Object.values(item).some(val =>
                String(val).toLowerCase().includes(searchTerm.toLowerCase())
            )
        );
    }, [sortedData, searchTerm]);

    // Pagination
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const currentData = filteredData.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const requestSort = (key: keyof T) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    if (isLoading) {
        return (
            <div className="w-full h-64 flex items-center justify-center rounded-xl border border-border bg-card">
                <div className="flex flex-col items-center gap-2">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                    <p className="text-sm text-muted-foreground">Cargando datos...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {/* Header tools */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="relative max-w-sm w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder={searchPlaceholder}
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {actionButton && (
                    <div>{actionButton}</div>
                )}
            </div>

            {/* Mobile View (Cards) */}
            <div className="block md:hidden space-y-4">
                {currentData.length > 0 ? (
                    currentData.map((item, index) => (
                        <div
                            key={item.id || index}
                            onClick={() => onRowClick && onRowClick(item)}
                            className={cn(onRowClick && "cursor-pointer")}
                        >
                            {/* If a custom mobile render is provided, use it. Otherwise fallback to a simple card */}
                            {/* @ts-ignore - Check if mobileItem exists on props (we'll add it to interface below) */}
                            {mobileItem ? mobileItem(item) : (
                                <div className="bg-card p-4 rounded-xl border border-border shadow-sm space-y-2">
                                    {columns.map((col) => (
                                        <div key={String(col.key)} className="flex justify-between items-center text-sm">
                                            <span className="font-medium text-muted-foreground">{col.label}</span>
                                            <span className="text-right">
                                                {col.render ? col.render(item) : String(item[col.key as keyof T] || '-')}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    <div className="w-full py-12 flex flex-col items-center justify-center text-muted-foreground gap-2 border border-border rounded-xl bg-card">
                        <Search className="h-8 w-8 opacity-20" />
                        <p>No se encontraron resultados</p>
                    </div>
                )}
            </div>

            {/* Desktop View (Table) */}
            <div className="hidden md:block rounded-xl border border-border bg-card overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                            <tr>
                                {columns.map((col) => (
                                    <th
                                        key={String(col.key)}
                                        scope="col"
                                        className={cn(
                                            "px-6 py-4 font-medium",
                                            col.sortable && "cursor-pointer hover:text-foreground transition-colors select-none"
                                        )}
                                        onClick={() => col.sortable && requestSort(col.key as keyof T)}
                                    >
                                        <div className="flex items-center gap-2">
                                            {col.label}
                                            {col.sortable && sortConfig?.key === col.key && (
                                                sortConfig.direction === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                                            )}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {currentData.length > 0 ? (
                                currentData.map((item, index) => (
                                    <tr
                                        key={item.id || index}
                                        onClick={() => onRowClick && onRowClick(item)}
                                        className={cn(
                                            "bg-card hover:bg-muted/50 transition-colors",
                                            onRowClick && "cursor-pointer"
                                        )}
                                    >
                                        {columns.map((col) => (
                                            <td key={String(col.key)} className="px-6 py-4 whitespace-nowrap">
                                                {col.render ? col.render(item) : String(item[col.key as keyof T] || '-')}
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={columns.length} className="px-6 py-12 text-center text-muted-foreground">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <Search className="h-8 w-8 opacity-20" />
                                            <p>No se encontraron resultados</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination (Desktop only here, mobile creates its own below or reused?) -> actually better to reuse pagination for both */}
            </div>

            {/* Pagination Controls (Shared) */}
            <div className="flex items-center justify-between px-2 sm:px-0 pt-2">
                <div className="text-xs text-muted-foreground">
                    Mostrando <span className="font-medium">{filteredData.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</span> a <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredData.length)}</span> de <span className="font-medium">{filteredData.length}</span> resultados
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-1 rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </button>
                    <span className="text-sm font-medium px-2">
                        {currentPage} / {Math.max(1, totalPages)}
                    </span>
                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage >= totalPages}
                        className="p-1 rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronRight className="h-5 w-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
