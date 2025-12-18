'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
    getGamificationConfig,
    updateGamificationConfig,
    GamificationConfig
} from '@/services/GamificationService';
import {
    Save,
    Award,
    CheckSquare,
    Fuel,
    Gauge,
    Gamepad2,
    AlertTriangle,
    Droplets
} from 'lucide-react';

type ConfigActions = GamificationConfig['actions'];

export default function GamificationAdminPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [config, setConfig] = useState<ConfigActions | null>(null);

    useEffect(() => {
        const fetchConfig = async () => {
            const data = await getGamificationConfig();
            setConfig(data.actions);
            setLoading(false);
        };
        fetchConfig();
    }, []);

    const handleChange = (key: keyof ConfigActions, value: string) => {
        if (!config) return;
        const numValue = parseInt(value) || 0;
        setConfig({ ...config, [key]: numValue });
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!config || !user?.id) return;

        setSaving(true);
        try {
            await updateGamificationConfig(config, user.id);
            alert('Configuración guardada correctamente');
        } catch (error) {
            console.error('Error saving config:', error);
            alert('Error al guardar la configuración');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center">Cargando configuración...</div>;
    }

    if (!config) {
        return <div className="p-8 text-center text-red-500">Error al cargar la configuración.</div>;
    }

    const CONFIG_ITEMS: { key: keyof ConfigActions; label: string; icon: any; description: string }[] = [
        {
            key: 'checklist_completed',
            label: 'Checklist Completado',
            icon: CheckSquare,
            description: 'Puntos otorgados al completar una inspección diaria.'
        },
        {
            key: 'log_km',
            label: 'Registro de Kilometraje',
            icon: Gauge,
            description: 'Puntos por registrar el odómetro del vehículo.'
        },
        {
            key: 'log_fuel',
            label: 'Repostaje de Combustible',
            icon: Fuel,
            description: 'Puntos por registrar una carga de combustible.'
        },
        {
            key: 'vehicle_wash',
            label: 'Lavado de Vehículo',
            icon: Droplets,
            description: 'Puntos por registrar limpieza del vehículo.'
        },
        {
            key: 'incident_reported',
            label: 'Reporte de Incidencia',
            icon: AlertTriangle,
            description: 'Puntos por notificar una avería o problema.'
        },
        {
            key: 'game_time_1min',
            label: 'Minuto de Juego',
            icon: Gamepad2,
            description: 'Puntos por cada minuto jugado en el área de descanso.'
        }
    ];

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-amber-500/10 rounded-xl text-amber-600">
                    <Award className="w-8 h-8" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Configuración de Gamificación</h1>
                    <p className="text-muted-foreground mt-1">Define cuántos puntos ganan los conductores por cada acción.</p>
                </div>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                    {CONFIG_ITEMS.map((item) => (
                        <div key={item.key} className="bg-card border border-border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                        <item.icon className="w-5 h-5" />
                                    </div>
                                    <h3 className="font-bold text-lg">{item.label}</h3>
                                </div>
                                <div className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-bold px-2 py-1 rounded">
                                    +{config[item.key]} pts
                                </div>
                            </div>

                            <p className="text-sm text-muted-foreground mb-4 min-h-[40px]">
                                {item.description}
                            </p>

                            <div className="relative">
                                <input
                                    type="number"
                                    min="0"
                                    value={config[item.key]}
                                    onChange={(e) => handleChange(item.key, e.target.value)}
                                    className="w-full pl-4 pr-12 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary outline-none transition font-mono font-medium"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                                    PTS
                                </span>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex justify-end pt-6 border-t border-border">
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8 py-3 rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                        {saving ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Save className="w-5 h-5" />
                        )}
                        Guardar Configuración
                    </button>
                </div>
            </form>
        </div>
    );
}
