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
    Star,
    MapPin,
    Camera,
    Search,
    Zap,
    Droplets,
    Hammer
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export default function DriverManual() {
    const [activeSection, setActiveSection] = useState<number | null>(null);

    const sections = [
        {
            title: "1. Inicio y Fin de Jornada",
            icon: Car,
            color: "bg-emerald-500/10 text-emerald-500",
            description: "Cómo empezar el día con el pie derecho y dejar el coche listo para el siguiente.",
            details: [
                {
                    subTitle: "Selección del Vehículo",
                    content: "En el dashboard, pulsa en 'Seleccionar Vehículo'. Puedes buscar por matrícula o modelo. Si tu coche asignado no aparece en la lista, contacta con tu gestor de flota inmediatamente.",
                    icon: Search
                },
                {
                    subTitle: "Registro de Kilometraje",
                    content: "Haz una foto clara del salpicadero donde se vea el kilometraje TOTAL. Introduce el número exacto en la app. Esto es vital para el mantenimiento preventivo.",
                    icon: Camera
                },
                {
                    subTitle: "Devolución y Parking",
                    content: "Al terminar, selecciona 'Devolver'. Indica la ubicación exacta (ej. 'Plaza 42, Planta -1'). No pongas 'donde siempre', sé específico para ayudar a tus compañeros.",
                    icon: MapPin
                }
            ]
        },
        {
            title: "2. Tareas Diarias y Mantenimiento",
            icon: CheckSquare,
            color: "bg-blue-500/10 text-blue-500",
            description: "Mantener el coche impecable es parte de tu profesionalidad.",
            details: [
                {
                    subTitle: "Checklist Pre-Viaje",
                    content: "Antes de arrancar, revisa: luces, niveles de aceite/agua y estado de los neumáticos. Un checklist completo te otorga 10 puntos de experiencia.",
                    icon: CheckSquare
                },
                {
                    subTitle: "Control de Combustible",
                    content: "Reporta el nivel actual (Lleno, 3/4, 1/2, Reserva). Si repostas, hazlo constar siempre para que el sistema de costes sea preciso.",
                    icon: Fuel
                },
                {
                    subTitle: "Limpieza y Lavado",
                    content: "Si el coche necesita un lavado, repórtalo tras realizarlo. Diferencia entre limpieza exterior (carrocería) e interior (habitáculo).",
                    icon: Droplets
                }
            ]
        },
        {
            title: "3. ¿Qué hacer en caso de Incidencia?",
            icon: AlertTriangle,
            color: "bg-amber-500/10 text-amber-500",
            description: "Mantén la calma y usa la app para que te ayudemos lo antes posible.",
            details: [
                {
                    subTitle: "Tipos de Incidencias",
                    content: "Diferenciamos entre 'Avería' (el coche no debe circular) y 'Daño Estético' (arañazos o golpes que no impiden el uso). Sé honesto en el reporte.",
                    icon: AlertTriangle
                },
                {
                    subTitle: "Cómo reportar",
                    content: "Pulsa 'Reportar Incidencia', elige la categoría, añade una descripción breve pero clara y sube fotos del daño. El equipo de flota recibirá un aviso al instante.",
                    icon: Camera
                },
                {
                    subTitle: "Seguridad ante todo",
                    icon: Zap,
                    content: "Si el coche supone un riesgo, márcalo como 'Avería Crítica'. El sistema bloqueará el vehículo para que nadie más lo use por error."
                }
            ]
        },
        {
            title: "4. Puntos, Premios y Rango",
            icon: Trophy,
            color: "bg-purple-500/10 text-purple-500",
            description: "Tu buen hacer tiene recompensa en esta empresa.",
            details: [
                {
                    subTitle: "Ganar Puntos",
                    content: "Cada tarea cuenta: Checklist (+10), Reportar Combustible (+5), Registrar Lavado (+5). Los reportes de calidad dan más prestigio.",
                    icon: Star
                },
                {
                    subTitle: "Subir de Rango",
                    content: "Empiezas como 'Novato'. A medida que acumulas puntos, subirás a 'Driver Pro', 'Elite' y finalmente 'Leyenda'. ¡Mira tu barra de progreso en el dashboard!",
                    icon: Trophy
                },
                {
                    subTitle: "Zona de Descanso",
                    content: "En tus pausas, entra en la 'Zona de Juegos'. Por cada minuto que pases relajándote allí, ganarás 1 punto extra de regalo.",
                    icon: Gamepad2
                }
            ]
        }
    ];

    return (
        <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary-500/30">
            <main className="max-w-2xl mx-auto px-4 pb-24 pt-8 animate-in fade-in duration-700">

                {/* Header with Background Gradient */}
                <div className="relative mb-8 text-center">
                    <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent -z-10 rounded-3xl h-64 mt-[-4rem]"></div>
                    <div className="inline-flex p-3 rounded-2xl bg-primary/10 mb-4 ring-1 ring-primary/20">
                        <BookOpen className="w-8 h-8 text-primary" />
                    </div>
                    <h1 className="text-4xl font-black tracking-tight text-foreground mb-2">
                        Manual del Conductor
                    </h1>
                    <p className="text-muted-foreground text-lg max-w-md mx-auto">
                        La guía definitiva para dominar la aplicación y cuidar de nuestra flota.
                    </p>
                </div>

                {/* Support Alert */}
                <div className="mb-10 p-5 rounded-2xl bg-card border border-primary/20 flex items-start gap-4 shadow-sm bg-gradient-to-r from-primary/5 to-transparent">
                    <Info className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                        <h2 className="font-bold text-foreground">¿Necesitas ayuda extra?</h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            Si algo no funciona o tienes dudas que no están aquí, pulsa el icono de ayuda en tu perfil para contactar con Soporte.
                        </p>
                    </div>
                </div>

                {/* Detailed Sections (Accordion-style for depth) */}
                <div className="space-y-6">
                    {sections.map((section, idx) => (
                        <div
                            key={idx}
                            className={`bg-card border transition-all duration-300 rounded-3xl overflow-hidden ${activeSection === idx ? 'border-primary ring-1 ring-primary/20' : 'border-border'}`}
                        >
                            <button
                                onClick={() => setActiveSection(activeSection === idx ? null : idx)}
                                className="w-full p-6 flex items-center justify-between hover:bg-muted/30 transition-colors"
                                aria-expanded={activeSection === idx}
                            >
                                <div className="flex items-center gap-5 text-left">
                                    <div className={`p-4 rounded-2xl ${section.color} shadow-sm`}>
                                        <section.icon className="w-8 h-8" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-foreground">{section.title}</h3>
                                        <p className="text-sm text-muted-foreground mt-1 hidden sm:block">{section.description}</p>
                                    </div>
                                </div>
                                <ChevronRight className={`w-6 h-6 text-muted-foreground transition-transform duration-300 ${activeSection === idx ? 'rotate-90' : ''}`} />
                            </button>

                            <div
                                className={`transition-all duration-300 ease-in-out ${activeSection === idx ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}
                            >
                                <div className="p-6 pt-0 border-t border-border mx-6 my-2 mt-0">
                                    <div className="space-y-6 mt-6">
                                        {section.details.map((detail, dIdx) => (
                                            <div key={dIdx} className="flex gap-4 group">
                                                <div className="mt-1 flex-shrink-0 w-8 h-8 rounded-xl bg-muted border border-border flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                                    <detail.icon className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-foreground mb-1">{detail.subTitle}</h4>
                                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                                        {detail.content}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Golden Rule Card */}
                <div className="mt-12 p-8 bg-black dark:bg-zinc-900 rounded-[2.5rem] border border-white/10 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-primary/20 rounded-full blur-[80px] -mr-20 -mt-20 group-hover:bg-primary/30 transition-colors duration-500"></div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
                            <span className="text-xs font-black uppercase tracking-[0.3em] text-yellow-500/80">Regla de Oro</span>
                        </div>
                        <h4 className="text-2xl font-black text-white mb-3 italic">"Cuidar el vehículo es cuidar de tu equipo."</h4>
                        <p className="text-zinc-400 text-sm leading-relaxed max-w-md">
                            Un reporte preciso hoy evita que un compañero se quede tirado mañana. La transparencia es el valor número uno de <strong>Marcha Fúnebre</strong>.
                        </p>
                    </div>
                </div>

                {/* Back Button */}
                <div className="mt-12 text-center pb-12">
                    <Link
                        href="/driver/dashboard"
                        className="inline-flex items-center gap-3 bg-primary text-primary-foreground px-10 py-4 rounded-full font-bold shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                    >
                        ¡Entendido, volver al Dashboard!
                        <ArrowRight className="w-5 h-5" />
                    </Link>
                </div>

            </main>
        </div>
    );
}
