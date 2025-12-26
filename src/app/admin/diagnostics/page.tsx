'use client';

import { useState } from 'react';

export default function DiagnosticsPage() {
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleTestEmail = async () => {
        setLoading(true);
        setResult(null);
        setError(null);

        try {
            const response = await fetch('/api/send-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    type: 'vehicle',
                    title: 'TEST DIAGNOSTIC EMAIL',
                    description: 'Esta es una prueba de diagnóstico para verificar la configuración del servidor y Resend.',
                    incidentId: 'test-diagnostic-id',
                    reporterName: 'Admin Debugger / Diagnóstico',
                    vehiclePlate: 'TEST-0000',
                    severity: 'critical',
                    date: new Date()
                }),
            });

            const data = await response.json();

            setResult({
                status: response.status,
                data: data
            });

        } catch (err: any) {
            setError(err.message || 'Error desconocido en cliente');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 space-y-6 bg-gray-50 min-h-screen">
            <h1 className="text-3xl font-bold text-gray-900">Diagnóstico del Sistema (PROD)</h1>

            <div className="grid grid-cols-1 gap-6">
                <div className="bg-white rounded-lg shadow border p-6">
                    <div className="mb-4">
                        <h2 className="text-xl font-bold">Prueba de Envío de Email</h2>
                        <p className="text-gray-500 mt-1">
                            Esta herramienta envía un email de prueba al endpoint `/api/send-email`.
                            Mostrará la respuesta EXACTA del servidor para depurar errores de configuración.
                        </p>
                    </div>
                    <div className="space-y-4">
                        <button
                            onClick={handleTestEmail}
                            disabled={loading}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md font-medium disabled:opacity-50"
                        >
                            {loading ? 'Enviando...' : 'Enviar Email de Prueba'}
                        </button>

                        {error && (
                            <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
                                <strong>Error de Cliente:</strong> {error}
                            </div>
                        )}

                        {result && (
                            <div className={`p-4 rounded-md border text-sm overflow-auto font-mono ${result.status === 200 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                                }`}>
                                <h3 className="font-bold mb-2">Estado HTTP: {result.status}</h3>
                                <pre className="whitespace-pre-wrap">
                                    {JSON.stringify(result.data, null, 2)}
                                </pre>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
