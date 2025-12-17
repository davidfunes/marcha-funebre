'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase/firebase';
import { collection, addDoc, doc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { logPoints } from '@/services/GamificationService';
import {
    CheckSquare,
    ArrowRight,
    ArrowLeft,
    CheckCircle,
    ThumbsUp,
    ThumbsDown,
    AlertTriangle
} from 'lucide-react';
import Link from 'next/link';

const CHECKLIST_STEPS = [
    {
        title: 'Exterior',
        items: [
            { id: 'tires', label: 'Presión de Neumáticos' },
            { id: 'lights', label: 'Luces / Faros' },
            { id: 'body', label: 'Carrocería (Golpes/Arañazos)' },
            { id: 'windows', label: 'Limpieza de Cristales' }
        ]
    },
    {
        title: 'Interior',
        items: [
            { id: 'cleanliness', label: 'Limpieza Interior' },
            { id: 'dashboard', label: 'Testigos del Tablero' },
            { id: 'fuel_level', label: 'Nivel de Combustible' },
            { id: 'documents', label: 'Documentación del Vehículo' }
        ]
    },
    {
        title: 'Equipamiento',
        items: [
            { id: 'vest', label: 'Chaleco Reflectante' },
            { id: 'triangle', label: 'Triángulos / Señal V-16' },
            { id: 'spare_tire', label: 'Rueda de Repuesto / Kit' }
        ]
    }
];

export default function ChecklistPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(0);
    const [answers, setAnswers] = useState<Record<string, 'ok' | 'issue'>>({});
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleAnswer = (itemId: string, status: 'ok' | 'issue') => {
        setAnswers(prev => ({ ...prev, [itemId]: status }));
    };

    const isStepComplete = () => {
        const stepItems = CHECKLIST_STEPS[currentStep].items;
        return stepItems.every(item => answers[item.id]);
    };

    const handleNext = () => {
        if (currentStep < CHECKLIST_STEPS.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            handleSubmit();
        }
    };

    const handleSubmit = async () => {
        if (!user || !user.assignedVehicleId) {
            alert('No tienes vehículo asignado.');
            return;
        }

        setLoading(true);

        try {
            // 1. Prepare Data
            const checklistData = {
                userId: user.id,
                vehicleId: user.assignedVehicleId,
                date: serverTimestamp(),
                items: Object.entries(answers).map(([id, status]) => ({ id, status, label: id })), // Simplified label for DB
                status: Object.values(answers).includes('issue') ? 'warning' : 'passed',
                createdAt: serverTimestamp()
            };

            await addDoc(collection(db, 'checklists'), checklistData);

            // 2. Gamification: Award 50 Points
            if (user.id) {
                await logPoints(user.id, 50, 'checklist_completed');
            }

            setSuccess(true);
            setTimeout(() => {
                router.push('/driver/dashboard');
            }, 2500);

        } catch (error) {
            console.error('Error saving checklist:', error);
            alert('Error al guardar el checklist');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center animate-in fade-in zoom-in duration-300">
                <div className="w-20 h-20 bg-purple-500 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-purple-500/20">
                    <CheckCircle className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-foreground mb-2">¡Inspección Completada!</h1>
                <p className="text-muted-foreground mb-6">Gracias por mantener la seguridad de la flota.</p>
                <div className="bg-yellow-500/10 px-6 py-3 rounded-full border border-yellow-500/20 text-yellow-600 font-bold text-lg animate-bounce">
                    +50 Puntos
                </div>
            </div>
        );
    }

    const currentStepData = CHECKLIST_STEPS[currentStep];
    const progress = ((currentStep + 1) / CHECKLIST_STEPS.length) * 100;

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col">
            {/* Header */}
            <div className="bg-card border-b border-border sticky top-0 z-10 px-4 py-4 flex items-center gap-4">
                <Link href="/driver/dashboard" className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors">
                    <ArrowLeft className="w-6 h-6" />
                </Link>
                <div className="flex-1">
                    <h1 className="text-lg font-bold font-display">Checklist Pre-Viaje</h1>
                    <div className="w-full bg-muted h-1 mt-2 rounded-full overflow-hidden">
                        <div
                            className="bg-primary h-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                </div>
                <span className="text-xs font-bold text-muted-foreground">
                    {currentStep + 1}/{CHECKLIST_STEPS.length}
                </span>
            </div>

            <main className="flex-1 p-4 pb-24 max-w-lg mx-auto w-full">
                <h2 className="text-2xl font-bold mb-6">{currentStepData.title}</h2>

                <div className="space-y-4">
                    {currentStepData.items.map((item) => (
                        <div
                            key={item.id}
                            className={`p-4 rounded-xl border transition-all ${answers[item.id]
                                ? 'bg-card border-primary/50 shadow-sm'
                                : 'bg-card border-border'
                                }`}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <span className="font-medium text-foreground">{item.label}</span>
                                {answers[item.id] === 'ok' && <CheckCircle className="w-5 h-5 text-green-500" />}
                                {answers[item.id] === 'issue' && <AlertTriangle className="w-5 h-5 text-amber-500" />}
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => handleAnswer(item.id, 'ok')}
                                    className={`py-2 px-3 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-colors ${answers[item.id] === 'ok'
                                        ? 'bg-green-500 text-white'
                                        : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                                        }`}
                                >
                                    <ThumbsUp className="w-4 h-4" /> Correcto
                                </button>
                                <button
                                    onClick={() => handleAnswer(item.id, 'issue')}
                                    className={`py-2 px-3 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-colors ${answers[item.id] === 'issue'
                                        ? 'bg-amber-500 text-white'
                                        : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                                        }`}
                                >
                                    <ThumbsDown className="w-4 h-4" /> Problema
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </main>

            <div className="bg-card border-t border-border p-4 sticky bottom-0 z-10 w-full">
                <div className="max-w-lg mx-auto">
                    <button
                        onClick={handleNext}
                        disabled={!isStepComplete() || loading}
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? 'Procesando...' : (
                            currentStep === CHECKLIST_STEPS.length - 1 ? 'Finalizar Inspección' : 'Siguiente'
                        )}
                        {!loading && <ArrowRight className="w-5 h-5" />}
                    </button>
                </div>
            </div>
        </div>
    );
}
