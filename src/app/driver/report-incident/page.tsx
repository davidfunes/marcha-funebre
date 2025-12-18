'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase/firebase';
import { collection, addDoc, doc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import {
    AlertTriangle,
    Camera,
    Send,
    ArrowLeft,
    CheckCircle
} from 'lucide-react';
import Link from 'next/link';
import { IncidentPriority, IncidentStatus } from '@/types';
import { awardPointsForAction } from '@/services/GamificationService';

import { Modal } from '@/components/ui/Modal';

export default function ReportIncidentPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    // Modal State
    const [modalConfig, setModalConfig] = useState<{ isOpen: boolean, title: string, message: string }>({
        isOpen: false,
        title: '',
        message: ''
    });

    const closeModal = () => setModalConfig({ ...modalConfig, isOpen: false });

    // Form States
    const [title, setTitle] = useState('');
    const [type, setType] = useState('mechanical');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState<IncidentPriority>('medium');
    const [image, setImage] = useState<File | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !user.assignedVehicleId) {
            setModalConfig({
                isOpen: true,
                title: 'Error de Asignación',
                message: 'No tienes un vehículo asignado actualmente. Por favor, selecciona uno antes de reportar una incidencia.'
            });
            return;
        }

        setLoading(true);

        try {
            // 1. Create Incident Entry
            const incidentData = {
                title,
                description,
                type,
                priority,
                status: 'open' as IncidentStatus,
                vehicleId: user.assignedVehicleId,
                reportedByUserId: user.id,
                images: image ? ['https://simulate-url.com/damage.jpg'] : [],
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };

            await addDoc(collection(db, 'incidents'), incidentData);

            // 2. Gamification: Award 25 Points
            if (user.id) {
                // Dynamic points
                await awardPointsForAction(user.id, 'incident_reported');
            }

            setSuccess(true);
            setTimeout(() => {
                router.push('/driver/dashboard');
            }, 2500);

        } catch (error) {
            console.error('Error saving incident:', error);
            setModalConfig({
                isOpen: true,
                title: 'Error',
                message: 'Ocurrió un error al enviar el reporte. Por favor, inténtalo de nuevo.'
            });
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center animate-in fade-in zoom-in duration-300">
                <div className="w-20 h-20 bg-amber-500 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-amber-500/20">
                    <CheckCircle className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-foreground mb-2">¡Reporte Enviado!</h1>
                <p className="text-muted-foreground mb-6">El equipo de mantenimiento ha sido notificado.</p>
                <div className="bg-yellow-500/10 px-6 py-3 rounded-full border border-yellow-500/20 text-yellow-600 font-bold text-lg animate-bounce">
                    Puntos añadidos
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground pb-20">
            {/* Header */}
            <div className="bg-card border-b border-border sticky top-0 z-10 px-4 py-4 flex items-center gap-4">
                <Link href="/driver/dashboard" className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors">
                    <ArrowLeft className="w-6 h-6" />
                </Link>
                <h1 className="text-xl font-bold font-display">Reportar Incidencia</h1>
            </div>

            <main className="p-4 max-w-lg mx-auto">
                <form onSubmit={handleSubmit} className="space-y-6">

                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-sm text-amber-800 dark:text-amber-200">
                            Si es una emergencia o accidente grave, contacta primero al 112 y a tu supervisor.
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Título del Problema</label>
                        <input
                            type="text"
                            required
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-4 py-3 bg-card border border-input rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                            placeholder="Ej: Luz de freno fundida"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">Tipo</label>
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                                className="w-full px-4 py-3 bg-card border border-input rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition appearance-none"
                            >
                                <option value="mechanical">Mecánico</option>
                                <option value="accident">Accidente</option>
                                <option value="tires">Neumáticos</option>
                                <option value="cleaning">Limpieza</option>
                                <option value="other">Otro</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">Prioridad</label>
                            <select
                                value={priority}
                                onChange={(e) => setPriority(e.target.value as IncidentPriority)}
                                className="w-full px-4 py-3 bg-card border border-input rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition appearance-none"
                            >
                                <option value="low">Baja</option>
                                <option value="medium">Media</option>
                                <option value="high">Alta</option>
                                <option value="critical">Crítica</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Descripción Detallada</label>
                        <textarea
                            required
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full px-4 py-3 bg-card border border-input rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition min-h-[120px]"
                            placeholder="Describe qué sucedió, dónde y cómo..."
                        ></textarea>
                    </div>

                    {/* Camera Upload */}
                    <div>
                        <span className="text-sm font-medium text-foreground mb-2 block">Evidencia Fotográfica</span>
                        <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-border rounded-xl cursor-pointer hover:bg-muted/50 transition bg-card">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <Camera className="w-10 h-10 text-muted-foreground mb-2" />
                                <p className="text-sm text-muted-foreground">Toca para añadir fotos</p>
                            </div>
                            <input
                                type="file"
                                className="hidden"
                                accept="image/*"
                                onChange={(e) => setImage(e.target.files?.[0] || null)}
                            />
                        </label>
                        {image && (
                            <p className="text-xs text-green-500 mt-2 font-medium flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" /> Imagen adjunta: {image.name}
                            </p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-red-500/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                        ) : (
                            <>
                                <Send className="w-5 h-5" />
                                Enviar Reporte
                            </>
                        )}
                    </button>
                </form>

                <Modal
                    isOpen={modalConfig.isOpen}
                    onClose={closeModal}
                    title={modalConfig.title}
                >
                    <div className="space-y-4">
                        <p className="text-foreground">{modalConfig.message}</p>
                        <button
                            onClick={closeModal}
                            className="w-full py-3 bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary/90"
                        >
                            Entendido
                        </button>
                    </div>
                </Modal>
            </main>
        </div>
    );
}
