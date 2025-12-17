'use client';

import { useState } from 'react';
import { RankingBoard } from '@/components/gamification/RankingBoard';
import { backfillPoints, debugUserGamification, forceBackfillUser } from '@/services/GamificationService';
import { RefreshCw, CheckCircle, Search, Wrench } from 'lucide-react';

export default function AdminRankingPage() {
    return (
        <div className="p-8 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Ranking de Conductores</h1>
                    <p className="text-muted-foreground mt-2">Seguimiento de rendimiento y gamificación de la flota.</p>
                </div>
                <SyncButton />
            </div>

            <div className="bg-card rounded-xl border border-border p-6 shadow-sm mb-8">
                <h2 className="text-lg font-semibold mb-4">Herramientas de Mantenimiento</h2>
                <div className="flex gap-4 items-start">
                    <SyncButton />
                    <DebugUserTool />
                </div>
            </div>

            <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
                <RankingBoard />
            </div>
        </div>
    );
}

function DebugUserTool() {
    const [email, setEmail] = useState('');
    const [result, setResult] = useState<any>(null);
    const [fixing, setFixing] = useState(false);

    const handleDebug = async () => {
        if (!email) return;
        const res = await debugUserGamification(email);
        setResult(res);
    };

    const handleFix = async () => {
        if (!email) return;
        setFixing(true);
        try {
            const res = await forceBackfillUser(email);
            if (res.success) {
                alert(`¡Corregido! Se han generado logs por ${res.diff} puntos.`);
                handleDebug(); // Refresh
            } else {
                alert(res.message);
            }
        } catch (e: any) {
            alert('Error: ' + e.message);
        } finally {
            setFixing(false);
        }
    };

    return (
        <div className="flex flex-col gap-2">
            <div className="flex gap-2">
                <input
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="Email del usuario..."
                    className="px-3 py-2 border rounded-lg text-sm"
                />
                <button
                    onClick={handleDebug}
                    className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                    title="Buscar info"
                >
                    <Search className="w-4 h-4" />
                </button>
                {result && result.pointsMismatch > 0 && (
                    <button
                        onClick={handleFix}
                        disabled={fixing}
                        className="p-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 animate-pulse"
                        title="Corregir puntos faltantes"
                    >
                        <Wrench className={`w-4 h-4 ${fixing ? 'animate-spin' : ''}`} />
                    </button>
                )}
            </div>
            {result && (
                <pre className="text-xs bg-slate-950 text-slate-50 p-4 rounded-lg overflow-auto max-w-sm">
                    {JSON.stringify(result, null, 2)}
                </pre>
            )}
        </div>
    );
}

function SyncButton() {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSync = async () => {
        if (!confirm('ATENCIÓN: Esto revisará a TODOS los usuarios y creará registros de puntos con fecha de HOY para cualquier diferencia encontrada. ¿Continuar con la MIGRACIÓN TOTAL?')) return;

        setLoading(true);
        try {
            const res = await backfillPoints();
            alert(`Migración completada.\nUsuarios actualizados: ${res.updatedCount}\nErrores: ${res.errorsCount}`);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
            window.location.reload();
        } catch (error) {
            alert('Error crítico durante la sincronización');
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleSync}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm"
        >
            {success ? <CheckCircle className="w-4 h-4" /> : <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
            {loading ? 'Migrando...' : 'FORZAR MIGRACIÓN TOTAL'}
        </button>
    );
}
