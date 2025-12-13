'use client';

import { useState } from 'react';
import {
    FileText,
    Download,
    BarChart3,
    PieChart
} from 'lucide-react';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Report } from '@/types';

// Mock data for reports since we don't have a backend generator yet
const MOCK_REPORTS: Report[] = [
    { id: '1', title: 'Resumen Financiero Q4 2024', type: 'financial', generatedAt: new Date('2024-12-01'), generatedByUserId: 'admin_1', summary: 'Gastos totales: 15.420€' },
    { id: '2', title: 'Incidencias Flota Noviembre', type: 'operational', generatedAt: new Date('2024-11-30'), generatedByUserId: 'admin_1', summary: '12 Incidencias registradas' },
    { id: '3', title: 'Inventario Anual', type: 'inventory', generatedAt: new Date('2024-11-15'), generatedByUserId: 'admin_1', summary: 'Stock valorado en 45.000€' },
];

export default function ReportsPage() {
    const [reports] = useState<Report[]>(MOCK_REPORTS);

    const columns: Column<Report>[] = [
        {
            key: 'title',
            label: 'Título del Reporte',
            sortable: true,
            render: (r) => (
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700">
                        <FileText className="h-4 w-4" />
                    </div>
                    <div>
                        <p className="font-medium">{r.title}</p>
                        <p className="text-xs text-muted-foreground capitalize">{r.type}</p>
                    </div>
                </div>
            )
        },
        {
            key: 'generatedAt',
            label: 'Fecha',
            sortable: true,
            render: (r) => r.generatedAt.toLocaleDateString()
        },
        { key: 'summary', label: 'Resumen' },
        {
            key: 'actions',
            label: 'Descargar',
            render: () => (
                <button className="p-2 hover:bg-muted rounded-full transition-colors text-primary">
                    <Download className="h-4 w-4" />
                </button>
            )
        }
    ];

    return (
        <div className="p-8 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Reportes y Análisis</h1>
                    <p className="text-muted-foreground mt-2">Exportación de datos y estadísticas de la flota.</p>
                </div>
            </div>

            {/* Quick Stats Cards Mockup */}
            <div className="grid gap-4 md:grid-cols-3">
                <div className="p-6 rounded-xl border border-border bg-card shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-100 rounded-lg">
                            <BarChart3 className="h-6 w-6 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Eficiencia Flota</p>
                            <h3 className="text-2xl font-bold">94%</h3>
                        </div>
                    </div>
                </div>
                <div className="p-6 rounded-xl border border-border bg-card shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-100 rounded-lg">
                            <PieChart className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Presupuesto Mantenimiento</p>
                            <h3 className="text-2xl font-bold">12.450€</h3>
                        </div>
                    </div>
                </div>
                <div className="p-6 rounded-xl border border-border bg-card shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-amber-100 rounded-lg">
                            <FileText className="h-6 w-6 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Reportes Generados</p>
                            <h3 className="text-2xl font-bold">24</h3>
                        </div>
                    </div>
                </div>
            </div>

            <DataTable
                columns={columns}
                data={reports}
                title="Archivos Recientes"
            />
        </div>
    );
}
