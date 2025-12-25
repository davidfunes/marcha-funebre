'use client';

import {
    BookOpen,
    Car,
    CheckSquare,
    Fuel,
    AlertTriangle,
    Gamepad2,
    Trophy,
    ArrowRight,
    Info,
    ChevronRight,
    ShieldCheck,
    Star
} from 'lucide-react';
import Link from 'next/link';

export default function DriverManual() {
    const sections = [
        {
            title: "Inicio y Fin de Jornada",
            icon: Car,
            color: "bg-emerald-500/10 text-emerald-500",
            steps: [
                "Selecciona 'Seleccionar Vehículo' al empezar.",
                "Anota los kilómetros y haz una foto del cuadro.",
                "Al terminar, dale a 'Devolver' y di dónde lo aparcas."
            ]
        },
        {
            title: "Tareas Diarias",
            icon: CheckSquare,
            color: "bg-blue-500/10 text-blue-500",
            steps: [
                "Checklist: Revisa que el coche esté bien (luces, niveles...).",
                "Combustible: Avisa si el depósito está bajo.",
                "Limpieza: Si el coche está sucio, repórtalo tras el lavado."
            ]
        },
        {
            title: "¿Problemas o Golpes?",
            icon: AlertTriangle,
            color: "bg-amber-500/10 text-amber-500",
            steps: [
                "Usa 'Reportar Incidencia' de inmediato.",
                "Describe el problema de forma sencilla.",
                "Haz fotos si es necesario para que el taller lo vea."
            ]
        },
        {
            title: "Puntos y Rangos",
            icon: Trophy,
            color: "bg-purple-500/10 text-purple-500",
            steps: [
                "Hacer las tareas (Checklist, KM) te da puntos.",
                "Sube de rango (de Novato a Leyenda) para fardar.",
                "¡Juega en la Zona de Descanso para ganar puntos extra!"
            ]
        }
    ];

    return (
        <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary-500/30">
            <main className="max-w-md mx-auto px-4 pb-20 pt-8 lg:pt-12 lg:max-w-4xl">
                {/* Header */}
                <div className="flex flex-col mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-xl bg-primary/10">
                            <BookOpen className="w-6 h-6 text-primary" />
                        </div>
                        <h1 className="text-3xl font-display font-bold text-foreground">
                            Guía Rápida
                        </h1>
                    </div>
                    <p className="text-muted-foreground">
                        Todo lo que necesitas saber para usar la app sin complicaciones.
                    </p>
                </div>

                {/* Introduction Card */}
                <div className="mb-10 p-6 rounded-2xl bg-card border border-border relative overflow-hidden shadow-sm group animate-in zoom-in duration-500 delay-150">
                    <div className="absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 bg-primary/10 rounded-full blur-3xl opacity-30"></div>
                    <div className="relative z-10 flex items-start gap-4">
                        <div className="p-3 rounded-full bg-primary/20 text-primary">
                            <Info className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold mb-2">¡Hola, compañero!</h2>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                Esta app es tu herramienta diaria. Úsala para llevar el control del coche y ganar puntos mientras trabajas. Es muy fácil, ¡solo sigue los pasos!
                            </p>
                        </div>
                    </div>
                </div>

                {/* Manual Sections */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    {sections.map((section, idx) => (
                        <div
                            key={idx}
                            className="bg-card border border-border p-6 rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 animate-in fade-in slide-in-from-bottom-4"
                            style={{ animationDelay: `${(idx + 3) * 100}ms` }}
                        >
                            <div className="flex items-center gap-4 mb-4">
                                <div className={`p-4 rounded-2xl ${section.color}`}>
                                    <section.icon className="w-7 h-7" />
                                </div>
                                <h3 className="text-xl font-black text-foreground">{section.title}</h3>
                            </div>

                            <ul className="space-y-4">
                                {section.steps.map((step, sIdx) => (
                                    <li key={sIdx} className="flex items-start gap-4 group">
                                        <div className="mt-1 flex-shrink-0 w-5 h-5 rounded-full border border-primary/30 flex items-center justify-center text-[10px] font-bold text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                            {sIdx + 1}
                                        </div>
                                        <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                                            {step}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                {/* Tip of the day */}
                <div className="mt-10 p-6 bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl border border-primary/20 flex flex-col items-center text-center animate-in fade-in duration-700 delay-700">
                    <Star className="w-8 h-8 text-primary mb-3 fill-primary/20 animate-pulse" />
                    <h4 className="text-lg font-bold text-foreground">Consejo de Oro</h4>
                    <p className="text-sm text-muted-foreground max-w-sm mt-2">
                        "Reportar el estado real de tu vehículo ayuda a tus compañeros a trabajar mejor y a ti a ganar más puntos."
                    </p>
                </div>

                {/* Final CTA */}
                <div className="mt-12 text-center">
                    <Link
                        href="/driver/dashboard"
                        className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-3 rounded-full font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
                    >
                        ¡Entendido, vamos al lío!
                        <ArrowRight className="w-5 h-5" />
                    </Link>
                </div>

            </main>
        </div>
    );
}
