'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { EmailService } from '@/services/EmailService';
import {
    AlertTriangle,
    Camera,
    Send,
    ArrowLeft,
    CheckCircle,
    Car,
    Package,
    Search,
    Loader2,
    Music,
    ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { IncidentPriority, IncidentStatus, InventoryItem, MaterialCondition } from '@/types';
import { awardPointsForAction } from '@/services/GamificationService';
import { getInventory, reportMaterialIncident, uploadFile } from '@/services/FirebaseService';

import { Modal } from '@/components/ui/Modal';

export default function ReportIncidentPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    // Reporting Phase / Type
    const [reportType, setReportType] = useState<'vehicle' | 'material' | null>(null);
    const [selectedMaterial, setSelectedMaterial] = useState<InventoryItem | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [materials, setMaterials] = useState<InventoryItem[]>([]);
    const [isLoadingMaterials, setIsLoadingMaterials] = useState(false);

    // Modal State
    const [modalConfig, setModalConfig] = useState<{ isOpen: boolean, title: string, message: string }>({
        isOpen: false,
        title: '',
        message: ''
    });

    const closeModal = () => setModalConfig({ ...modalConfig, isOpen: false });

    // Common Form States
    const [description, setDescription] = useState('');
    const [image, setImage] = useState<File | null>(null);

    // Vehicle Specific Form States
    const [title, setTitle] = useState('');
    const [type, setType] = useState('mechanical');
    const [priority, setPriority] = useState<IncidentPriority>('medium');

    // Material Specific Form States
    const [condition, setCondition] = useState<MaterialCondition | ''>('');

    // Fetch materials if vehicle is assigned
    useEffect(() => {
        if (reportType === 'material' && user?.assignedVehicleId) {
            const fetchMaterials = async () => {
                setIsLoadingMaterials(true);
                try {
                    const allInventory = await getInventory();
                    const filtered = allInventory.filter(item =>
                        (item.locations || []).some(loc => loc.type === 'vehicle' && loc.id === user.assignedVehicleId)
                    );
                    setMaterials(filtered);
                } catch (error) {
                    console.error("Error fetching materials:", error);
                } finally {
                    setIsLoadingMaterials(false);
                }
            };
            fetchMaterials();
        }
    }, [reportType, user?.assignedVehicleId]);

    const handleVehicleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !user.assignedVehicleId) {
            setModalConfig({
                isOpen: true,
                title: 'Error de Asignación',
                message: 'No tienes un vehículo asignado actualmente.'
            });
            return;
        }

        setLoading(true);

        try {
            let imageUrls: string[] = [];
            if (image) {
                const path = `incidents/${user.id}/vehicle_${Date.now()}_${image.name}`;
                const url = await uploadFile(image, path);
                imageUrls = [url];
            }

            const incidentData = {
                title,
                description,
                type,
                priority,
                status: 'open' as IncidentStatus,
                vehicleId: user.assignedVehicleId,
                reportedByUserId: user.id,
                images: imageUrls,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };

            const incidentRef = await addDoc(collection(db, 'incidents'), incidentData);

            // Send Email Alert
            try {
                // Fetch vehicle details for the email
                let vehiclePlate = 'Vehículo Desconocido';
                if (user.assignedVehicleId) {
                    const vehicleDoc = await getDoc(doc(db, 'vehicles', user.assignedVehicleId));
                    if (vehicleDoc.exists()) {
                        const vehicleData = vehicleDoc.data();
                        vehiclePlate = `${vehicleData.brand} ${vehicleData.model} (${vehicleData.plate})`;
                    }
                }

                await EmailService.sendIncidentAlert({
                    type: 'vehicle',
                    title: incidentData.title,
                    description: incidentData.description,
                    incidentId: incidentRef.id,
                    reporterName: `${user.name} ${user.firstSurname}`,
                    vehiclePlate: vehiclePlate,
                    severity: incidentData.priority,
                    imageUrl: imageUrls[0], // Send the first image if available
                    date: new Date()
                });
            } catch (emailError) {
                console.error("Error sending email alert (background):", emailError);
                // We don't block the UI flow for this
            }

            if (user.id) {
                await awardPointsForAction(user.id, 'incident_reported');
            }

            setSuccess(true);
            setTimeout(() => router.push('/driver/dashboard'), 2500);

        } catch (error: any) {
            console.error('Error saving vehicle incident:', error);
            const errorMessage = error.message || 'Error desconocido';
            const errorCode = error.code || 'n/a';

            setModalConfig({
                isOpen: true,
                title: 'Error al Enviar',
                message: `No se pudo enviar el reporte: ${errorMessage} (${errorCode}). Si el error persiste, contacta al administrador.`
            });
        } finally {
            setLoading(false);
        }
    };

    const handleMaterialSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !user.assignedVehicleId || !selectedMaterial || !condition) return;

        setLoading(true);
        try {
            let imageUrls: string[] = [];
            if (image) {
                const path = `incidents/${user.id}/material_${Date.now()}_${image.name}`;
                const url = await uploadFile(image, path);
                imageUrls = [url];
            }

            await reportMaterialIncident(
                {
                    title: `Incidencia Material: ${selectedMaterial.name}`,
                    description,
                    priority: condition === 'working_urgent_change' ? 'medium' : 'low',
                    reportedByUserId: user.id!,
                    vehicleId: user.assignedVehicleId,
                    images: imageUrls
                },
                selectedMaterial.id!,
                user.assignedVehicleId,
                condition as MaterialCondition
            );

            if (user.id) {
                await awardPointsForAction(user.id, 'incident_reported');
            }

            setSuccess(true);
            setTimeout(() => router.push('/driver/dashboard'), 2500);

        } catch (error: any) {
            console.error('Error saving material incident:', error);
            const errorMessage = error.message || 'Error desconocido';
            const errorCode = error.code || 'n/a';

            setModalConfig({
                isOpen: true,
                title: 'Error al Enviar',
                message: `No se pudo reportar la incidencia del material: ${errorMessage} (${errorCode}). Si el bug persiste envíame una captura de este mensaje.`
            });
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setReportType(null);
        setSelectedMaterial(null);
        setTitle('');
        setDescription('');
        setCondition('');
        setImage(null);
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

    const filteredMaterials = materials.filter(m =>
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.category?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-background text-foreground pb-20">
            {/* Header */}
            <div className="bg-card border-b border-border sticky top-0 z-10 px-4 py-4 flex items-center gap-4">
                <button
                    onClick={() => {
                        if (selectedMaterial) setSelectedMaterial(null);
                        else if (reportType) setReportType(null);
                        else router.push('/driver/dashboard');
                    }}
                    className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <h1 className="text-xl font-bold font-display">
                    {!reportType ? 'Reportar Incidencia' :
                        reportType === 'vehicle' ? 'Incidencia de Vehículo' :
                            !selectedMaterial ? 'Seleccionar Material' : 'Detalles de Material'}
                </h1>
            </div>

            <main className="p-4 max-w-lg mx-auto">
                {!reportType ? (
                    <div className="space-y-4 pt-4">
                        <p className="text-muted-foreground text-center mb-8">¿Sobre qué quieres informar?</p>

                        <button
                            onClick={() => setReportType('vehicle')}
                            className="w-full bg-card border border-border p-6 rounded-2xl flex items-center gap-6 hover:bg-muted/50 transition-all group"
                        >
                            <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Car className="w-8 h-8 text-blue-500" />
                            </div>
                            <div className="text-left">
                                <h3 className="text-lg font-bold">Vehículo</h3>
                                <p className="text-sm text-muted-foreground">Averías, golpes o revisiones</p>
                            </div>
                            <ChevronRight className="w-6 h-6 ml-auto text-muted-foreground" />
                        </button>

                        <button
                            onClick={() => setReportType('material')}
                            className="w-full bg-card border border-border p-6 rounded-2xl flex items-center gap-6 hover:bg-muted/50 transition-all group"
                        >
                            <div className="w-14 h-14 bg-purple-500/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Package className="w-8 h-8 text-purple-500" />
                            </div>
                            <div className="text-left">
                                <h3 className="text-lg font-bold">Material / Equipaje</h3>
                                <p className="text-sm text-muted-foreground">Objetos rotos o faltantes</p>
                            </div>
                            <ChevronRight className="w-6 h-6 ml-auto text-muted-foreground" />
                        </button>
                    </div>
                ) : reportType === 'vehicle' ? (
                    <form onSubmit={handleVehicleSubmit} className="space-y-6">
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                            <p className="text-sm text-amber-800 dark:text-amber-200">
                                Si es una emergencia o accidente grave, contacta primero al 112 y a tu supervisor.
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1.5 px-1">Título del Problema</label>
                            <input
                                type="text"
                                required
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full px-4 py-3 bg-card border border-input rounded-xl focus:ring-2 focus:ring-primary outline-none transition"
                                placeholder="Ej: Luz de freno fundida"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1.5 px-1">Tipo</label>
                                <select
                                    value={type}
                                    onChange={(e) => setType(e.target.value)}
                                    className="w-full px-4 py-3 bg-card border border-input rounded-xl outline-none"
                                >
                                    <option value="mechanical">Mecánico</option>
                                    <option value="accident">Accidente</option>
                                    <option value="tires">Neumáticos</option>
                                    <option value="cleaning">Limpieza</option>
                                    <option value="other">Otro</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1.5 px-1">Prioridad</label>
                                <select
                                    value={priority}
                                    onChange={(e) => setPriority(e.target.value as IncidentPriority)}
                                    className="w-full px-4 py-3 bg-card border border-input rounded-xl outline-none"
                                >
                                    <option value="low">Baja</option>
                                    <option value="medium">Media</option>
                                    <option value="high">Alta</option>
                                    <option value="critical">Crítica</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1.5 px-1">Descripción</label>
                            <textarea
                                required
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full px-4 py-3 bg-card border border-input rounded-xl outline-none min-h-[120px]"
                                placeholder="Describe qué sucedió..."
                            />
                        </div>

                        {/* Camera */}
                        <div>
                            <span className="block text-sm font-medium mb-1.5 px-1">Evidencia Fotográfica</span>
                            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-xl cursor-pointer hover:bg-muted/50 transition">
                                <Camera className="w-8 h-8 text-muted-foreground mb-2" />
                                <p className="text-xs text-muted-foreground">Toca para añadir fotos</p>
                                <input type="file" className="hidden" accept="image/*" onChange={(e) => setImage(e.target.files?.[0] || null)} />
                            </label>
                            {image && <p className="text-xs text-green-500 mt-2">✓ {image.name}</p>}
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-5 h-5" /> Enviar Reporte</>}
                        </button>
                    </form>
                ) : !selectedMaterial ? (
                    <div className="space-y-4 overflow-hidden">
                        <div className="relative mb-6">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Buscar material por nombre..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-card border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>

                        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
                            {isLoadingMaterials ? (
                                <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                            ) : filteredMaterials.length > 0 ? (
                                filteredMaterials.map(item => (
                                    <button
                                        key={item.id}
                                        onClick={() => setSelectedMaterial(item)}
                                        className="w-full bg-card border border-border p-4 rounded-xl flex items-center gap-4 hover:bg-muted/30 transition-all text-left"
                                    >
                                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                                            <Music className="w-5 h-5 text-primary" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold truncate">{item.name}</p>
                                            <p className="text-xs text-muted-foreground capitalize">{item.category}</p>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                                    </button>
                                ))
                            ) : (
                                <p className="text-center py-12 text-muted-foreground italic">No hay resultados para tu búsqueda.</p>
                            )}
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleMaterialSubmit} className="space-y-6">
                        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center gap-4">
                            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                                <Music className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <h3 className="font-bold">{selectedMaterial.name}</h3>
                                <p className="text-xs text-muted-foreground">{selectedMaterial.category}</p>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1.5 px-1">Estado del Material</label>
                            <select
                                required
                                value={condition}
                                onChange={(e) => setCondition(e.target.value as MaterialCondition)}
                                className="w-full px-4 py-3 bg-card border border-input rounded-xl outline-none"
                            >
                                <option value="" disabled>Selecciona cómo se encuentra...</option>
                                <option value="new_functional">Nuevo o funcional</option>
                                <option value="working_urgent_change">Funciona pero urge cambio</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1.5 px-1">¿Qué ha pasado?</label>
                            <textarea
                                required
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full px-4 py-3 bg-card border border-input rounded-xl outline-none min-h-[120px]"
                                placeholder="Explica brevemente el problema..."
                            />
                        </div>

                        {/* Camera (Optional for material) */}
                        <div>
                            <span className="block text-sm font-medium mb-1.5 px-1">Foto (Opcional)</span>
                            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-xl cursor-pointer hover:bg-muted/50 transition">
                                <Camera className="w-8 h-8 text-muted-foreground mb-2" />
                                <p className="text-xs text-muted-foreground">Toca para añadir fotos</p>
                                <input type="file" className="hidden" accept="image/*" onChange={(e) => setImage(e.target.files?.[0] || null)} />
                            </label>
                            {image && <p className="text-xs text-green-500 mt-2">✓ {image.name}</p>}
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !condition}
                            className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-5 h-5" /> Enviar Reporte de Material</>}
                        </button>
                    </form>
                )}

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
