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
    viewMode?: 'table' | 'grid' | 'auto';
    breakpoint?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export function DataTable<T extends { id?: string }>({
    columns,
    data,
    title,
    actionButton,
    searchPlaceholder = "Buscar...",
    onRowClick,
    isLoading,
    mobileItem,
    viewMode = 'auto',
    breakpoint = 'md'
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

    // View Mode Logic
    // If auto, we rely on breakpoint.
    // We use a map to ensure Tailwind scanner picks up the full class names.
    // NOTE: For grid, we DO NOT use 'block' because it overrides 'display: grid'.
    // We only need to specify when it is HIDDEN. the default 'grid' class handles visibility when not hidden.
    const visibilityMap = {
        sm: {
            grid: 'sm:hidden',
            table: 'hidden sm:block',
            sort: 'flex sm:hidden'
        },
        md: {
            grid: 'md:hidden',
            table: 'hidden md:block',
            sort: 'flex md:hidden'
        },
        lg: {
            grid: 'lg:hidden',
            table: 'hidden lg:block',
            sort: 'flex lg:hidden'
        },
        xl: {
            grid: 'xl:hidden',
            table: 'hidden xl:block',
            sort: 'flex xl:hidden'
        },
        '2xl': {
            grid: '2xl:hidden',
            table: 'hidden 2xl:block',
            sort: 'flex 2xl:hidden'
        }
    };

    const gridVisibilityClass = viewMode === 'grid'
        ? '' // Default display:grid is already on the element
        : viewMode === 'table'
            ? 'hidden'
            : visibilityMap[breakpoint].grid;

    const tableVisibilityClass = viewMode === 'table'
        ? 'block'
        : viewMode === 'grid'
            ? 'hidden'
            : visibilityMap[breakpoint].table;

    const sortDropdownVisibilityClass = viewMode === 'grid'
        ? 'flex'
        : viewMode === 'table'
            ? 'hidden'
            : visibilityMap[breakpoint].sort;


    return (
        <div className="space-y-6">
            {/* Header tools */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2 w-full sm:w-auto flex-1 max-w-sm">
                    <div className="relative w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder={searchPlaceholder}
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                    {/* Sort Dropdown for Grid View mostly */}
                    <div className="relative">
                        <select
                            className={cn(
                                "absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer",
                                sortDropdownVisibilityClass === 'hidden' && "hidden"
                            )}
                            value={sortConfig ? `${String(sortConfig.key)}-${sortConfig.direction}` : ''}
                            onChange={(e) => {
                                const [key, dir] = e.target.value.split('-');
                                if (key) setSortConfig({ key: key as keyof T, direction: dir as 'asc' | 'desc' });
                            }}
                            disabled={sortDropdownVisibilityClass === 'hidden'}
                        >
                            <option value="" disabled>Ordenar por...</option>
                            {columns.filter(c => c.sortable).flatMap((col) => [
                                <option key={`${String(col.key)}-asc`} value={`${String(col.key)}-asc`}>
                                    {col.label} (Asc)
                                </option>,
                                <option key={`${String(col.key)}-desc`} value={`${String(col.key)}-desc`}>
                                    {col.label} (Desc)
                                </option>
                            ])}
                        </select>
                        <button
                            className={cn(
                                "items-center gap-2 px-3 py-2 rounded-lg border bg-background hover:bg-muted transition-colors text-sm font-medium",
                                sortDropdownVisibilityClass
                            )}
                        >
                            <span className="truncate max-w-[100px] sm:max-w-none">
                                {sortConfig
                                    ? `${columns.find(c => c.key === sortConfig.key)?.label} (${sortConfig.direction === 'asc' ? 'Asc' : 'Desc'})`
                                    : 'Ordenar'
                                }
                            </span>
                            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                        </button>
                    </div>

                    {actionButton && (
                        <div>{actionButton}</div>
                    )}
                </div>
            </div>

            {/* Content Area */}
            {currentData.length > 0 ? (
                <>
                    {/* Grid View Implementation */}
                    <div className={cn(
                        "grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3",
                        gridVisibilityClass
                    )}>
                        {currentData.map((item, index) => (
                            <div
                                key={item.id || index}
                                onClick={() => onRowClick && onRowClick(item)}
                                className={cn(onRowClick && "cursor-pointer h-full")}
                            >
                                {mobileItem ? mobileItem(item) : (
                                    <div className="bg-card p-4 rounded-xl border border-border shadow-sm space-y-2 h-full">
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
                        ))}
                    </div>

                    {/* Table View Implementation */}
                    <div className={cn(
                        "rounded-xl border border-border bg-card overflow-hidden shadow-sm",
                        tableVisibilityClass
                    )}>
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
                                    {currentData.map((item, index) => (
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
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            ) : (
                <div className="w-full py-16 flex flex-col items-center justify-center text-muted-foreground gap-4 border border-border rounded-xl bg-card border-dashed">
                    <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center opacity-50">
                        <Search className="h-8 w-8" />
                    </div>
                    <div className="text-center">
                        <p className="font-medium text-lg text-foreground">No se encontraron resultados</p>
                        <p className="text-sm">Prueba ajustando los términos de búsqueda</p>
                    </div>
                </div>
            )}

            {/* Pagination Controls (Shared) */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between px-2 sm:px-0 pt-2 border-t border-transparent">
                    <div className="text-xs text-muted-foreground hidden sm:block">
                        Mostrando <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> a <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredData.length)}</span> de <span className="font-medium">{filteredData.length}</span> resultados
                    </div>
                    <div className="flex items-center gap-2 mx-auto sm:mx-0">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="p-2 rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <span className="text-sm font-medium px-4 py-2 bg-muted/50 rounded-lg border border-border/50 min-w-[80px] text-center">
                            {currentPage} / {Math.max(1, totalPages)}
                        </span>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage >= totalPages}
                            className="p-2 rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
