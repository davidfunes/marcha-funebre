'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase/firebase';
import { collection, addDoc, doc, updateDoc, increment, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import {
    Fuel,
    Settings,
    Camera,
    Save,
    ArrowLeft,
    CheckCircle,
    Car,
    X,
    RefreshCw,
    ScanLine
} from 'lucide-react';
import Link from 'next/link';
import { Vehicle } from '@/types';
import { createWorker } from 'tesseract.js';
import { logPoints } from '@/services/GamificationService';

type LogType = 'km' | 'fuel';

export default function LogKmFuelPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<LogType>('km');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    // Vehicle Selection State (if not assigned)
    const [availableVehicles, setAvailableVehicles] = useState<Vehicle[]>([]);
    const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
    const [isLoadingVehicles, setIsLoadingVehicles] = useState(false);

    // Form States
    const [odometer, setOdometer] = useState('');
    const [liters, setLiters] = useState('');
    const [cost, setCost] = useState('');
    const [notes, setNotes] = useState('');
    const [image, setImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    // Camera & OCR States
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [cameraError, setCameraError] = useState('');
    const [isScanning, setIsScanning] = useState(false);
    const [ocrCandidates, setOcrCandidates] = useState<string[]>([]);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    useEffect(() => {
        const fetchVehicles = async () => {
            if (user && !user.assignedVehicleId) {
                setIsLoadingVehicles(true);
                try {
                    const q = query(
                        collection(db, 'vehicles'),
                        where('status', '==', 'active')
                    );
                    const snapshot = await getDocs(q);
                    const vehicles: Vehicle[] = [];
                    snapshot.forEach((doc) => {
                        const data = doc.data() as Vehicle;
                        // Filters: Not assigned, Not Management
                        if (!data.assignedDriverId && !data.isManagement) {
                            vehicles.push({ id: doc.id, ...data });
                        }
                    });
                    setAvailableVehicles(vehicles);
                } catch (error) {
                    console.error("Error fetching vehicles:", error);
                } finally {
                    setIsLoadingVehicles(false);
                }
            } else if (user?.assignedVehicleId) {
                // If user has a vehicle, pre-select it implicitly (logic handled in submit)
                setSelectedVehicleId(user.assignedVehicleId);
            }
        };

        fetchVehicles();
    }, [user]);

    // Cleanup camera stream on unmount
    useEffect(() => {
        return () => {
            stopCamera();
        };
    }, []);

    // NEW: Attach stream to video element when isCameraOpen becomes true
    useEffect(() => {
        if (isCameraOpen && videoRef.current && streamRef.current) {
            videoRef.current.srcObject = streamRef.current;
        }
    }, [isCameraOpen]);

    const startCamera = async () => {
        setCameraError('');
        try {
            // Request camera only
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' } // Prefer back camera
            });

            streamRef.current = stream; // Store the stream in the ref
            setIsCameraOpen(true); // Trigger the useEffect to attach the stream

        } catch (err) {
            console.error("Error accessing camera:", err);
            setCameraError('No se pudo acceder a la cámara. Asegúrate de dar permisos.');
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            const tracks = streamRef.current.getTracks();
            tracks.forEach(track => track.stop());
            streamRef.current = null; // Clear the stream reference
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null; // Also clear the video element's source
        }
        setIsCameraOpen(false);
    };

    const processImageWithOCR = async (imageBlob: Blob) => {
        if (activeTab !== 'km') return; // Only process for Mileage

        setIsScanning(true);
        setOcrCandidates([]); // Clear previous candidates
        try {
            const worker = await createWorker('eng');
            const result = await worker.recognize(imageBlob);
            await worker.terminate();

            const text = result.data.text;
            console.log("OCR Text:", text);

            // Improved Regex: Capture any sequence of digits, commas, or dots (relaxed boundaries)
            // This handles cases like "12345km" where \b would fail before 'k'
            const matches = text.match(/[0-9][0-9,.]*/g);

            if (matches && matches.length > 0) {
                const validCandidates = matches
                    .map(m => m.replace(/,/g, '.')) // Standardize to dots
                    .map(m => m.replace(/\.$/, '')) // Remove trailing dot if any
                    .filter(val => {
                        // Must have at least one digit and be a valid number
                        if (!/\d/.test(val)) return false;
                        const num = parseFloat(val);
                        // Relaxed limits: min 10 (could be trip distance), max 2M
                        return !isNaN(num) && num > 10 && num < 2000000;
                    });

                if (validCandidates && validCandidates.length > 0) {
                    const uniqueCandidates = Array.from(new Set(validCandidates)).sort((a, b) => parseFloat(b) - parseFloat(a));
                    setOcrCandidates(uniqueCandidates);

                    // Optional: If exactly one strong candidate (e.g. 5+ digits), maybe auto-select?
                    // For now, let user select to be safe, unless only 1 found.
                    if (uniqueCandidates.length === 1) {
                        setOdometer(uniqueCandidates[0]);
                    }

                } else {
                    console.log("No detected valid mileage numbers");
                    // Fallback: try looking for "km" proximity? (Too complex for now)
                }
            }
        } catch (error) {
            console.error("OCR Error:", error);
        } finally {
            setIsScanning(false);
        }
    };

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');

            if (context) {
                // Set canvas size to match video dimensions
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;

                // Draw the video frame to the canvas
                context.drawImage(video, 0, 0, canvas.width, canvas.height);

                // Convert to data URL for preview
                const dataUrl = canvas.toDataURL('image/jpeg');
                setImagePreview(dataUrl);

                // Convert to blob/file for upload and OCR
                canvas.toBlob((blob) => {
                    if (blob) {
                        const file = new File([blob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
                        setImage(file);
                        stopCamera(); // Close camera after capture

                        // Trigger OCR
                        processImageWithOCR(blob);
                    }
                }, 'image/jpeg', 0.8);
            }
        }
    };

    const retakePhoto = () => {
        setImage(null);
        setImagePreview(null);
        setOdometer(''); // Reset detected odometer if retaking
        setOcrCandidates([]);
        startCamera();
    };

    const selectCandidate = (value: string) => {
        setOdometer(value);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const targetVehicleId = user?.assignedVehicleId || selectedVehicleId;

        if (!targetVehicleId) {
            alert('Debes tener un vehículo asignado o seleccionar uno.');
            return;
        }

        setLoading(true);

        try {
            // 1. Create Log Entry
            const logData = {
                userId: user!.id,
                vehicleId: targetVehicleId,
                date: serverTimestamp(),
                type: activeTab,
                value: activeTab === 'km' ? Number(odometer) : Number(liters),
                cost: activeTab === 'fuel' ? Number(cost) : null,
                notes,
                // Image upload would happen here, getting URL. Simulating for now.
                imageUrl: image ? 'https://simulate-url.com/receipt.jpg' : null,
                createdAt: serverTimestamp()
            };

            await addDoc(collection(db, 'logs'), logData);

            // 2. Update Vehicle Odometer if KM log
            if (activeTab === 'km') {
                await updateDoc(doc(db, 'vehicles', targetVehicleId), {
                    odometer: Number(odometer),
                    updatedAt: serverTimestamp()
                });
            }

            // 3. Gamification: Award 10 Points
            if (user!.id) {
                await logPoints(user!.id, 10, `log_${activeTab}`);
            }

            setSuccess(true);
            setTimeout(() => {
                router.push('/driver/dashboard');
            }, 2000);

        } catch (error) {
            console.error('Error saving log:', error);
            alert('Error al guardar el registro');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center animate-in fade-in zoom-in duration-300">
                <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-green-500/20">
                    <CheckCircle className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-foreground mb-2">¡Registro Guardado!</h1>
                <p className="text-muted-foreground mb-6">Información actualizada correctamente.</p>
                <div className="bg-yellow-500/10 px-6 py-3 rounded-full border border-yellow-500/20 text-yellow-600 font-bold text-lg animate-bounce">
                    +10 Puntos
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
                <h1 className="text-xl font-bold font-display">Registrar Actividad</h1>
            </div>

            <main className="p-4 max-w-lg mx-auto">
                {/* Tabs */}
                <div className="grid grid-cols-2 gap-2 mb-8 bg-muted p-1 rounded-xl">
                    <button
                        onClick={() => setActiveTab('km')}
                        className={`flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'km'
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        <Settings className="w-4 h-4" />
                        Kilometraje
                    </button>
                    <button
                        onClick={() => setActiveTab('fuel')}
                        className={`flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'fuel'
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        <Fuel className="w-4 h-4" />
                        Combustible
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Vehicle Selection Loop */}
                    {!user?.assignedVehicleId && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-4 duration-300">
                            <label className="text-sm font-medium text-foreground">Seleccionar Vehículo</label>
                            {isLoadingVehicles ? (
                                <div className="h-12 w-full bg-muted animate-pulse rounded-xl"></div>
                            ) : (
                                <div className="relative">
                                    <Car className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                                    <select
                                        value={selectedVehicleId}
                                        onChange={(e) => setSelectedVehicleId(e.target.value)}
                                        required
                                        className="w-full pl-12 pr-4 py-3 bg-card border border-input rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition appearance-none"
                                    >
                                        <option value="">-- Elige un vehículo --</option>
                                        {availableVehicles.map(v => (
                                            <option key={v.id} value={v.id}>
                                                {v.brand} {v.model} - {v.plate}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <p className="text-xs text-muted-foreground">
                                No tienes vehículo asignado. Selecciona el que estás usando hoy.
                            </p>
                        </div>
                    )}

                    {activeTab === 'km' ? (
                        <div className="space-y-4">
                            <label className="block">
                                <span className="text-sm font-medium text-foreground">Nuevo Kilometraje</span>
                                <div className="mt-1 relative">
                                    <input
                                        type="number"
                                        required
                                        value={odometer}
                                        onChange={(e) => setOdometer(e.target.value)}
                                        className="w-full px-4 py-3 bg-card border border-input rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition text-lg"
                                        placeholder="000000"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">KM</span>
                                    {isScanning && (
                                        <div className="absolute right-12 top-1/2 -translate-y-1/2">
                                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>
                                        </div>
                                    )}
                                </div>
                            </label>

                            <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-4 text-sm text-blue-600">
                                <p>Por favor, asegúrate de introducir el valor exacto que marca el tablero.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <label className="block">
                                    <span className="text-sm font-medium text-foreground">Litros</span>
                                    <div className="mt-1 relative">
                                        <input
                                            type="number"
                                            required
                                            step="0.01"
                                            value={liters}
                                            onChange={(e) => setLiters(e.target.value)}
                                            className="w-full px-4 py-3 bg-card border border-input rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                                            placeholder="0.00"
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">L</span>
                                    </div>
                                </label>
                                <label className="block">
                                    <span className="text-sm font-medium text-foreground">Coste Total</span>
                                    <div className="mt-1 relative">
                                        <input
                                            type="number"
                                            required
                                            step="0.01"
                                            value={cost}
                                            onChange={(e) => setCost(e.target.value)}
                                            className="w-full px-4 py-3 bg-card border border-input rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                                            placeholder="0.00"
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">€</span>
                                    </div>
                                </label>
                            </div>
                        </div>
                    )}

                    {/* Camera Capture Section */}
                    <div>
                        <span className="text-sm font-medium text-foreground mb-2 block">
                            {activeTab === 'km' ? 'Foto del Tablero y Escaneo' : 'Foto del Recibo'}
                        </span>

                        {isCameraOpen ? (
                            <div className="relative rounded-xl overflow-hidden bg-black aspect-[4/3] shadow-lg">
                                {/* Video Feed */}
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    className="w-full h-full object-cover"
                                />
                                <canvas ref={canvasRef} className="hidden" />

                                {/* Camera Controls */}
                                <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4 items-center z-10">
                                    <button
                                        type="button"
                                        onClick={stopCamera}
                                        className="bg-white/20 backdrop-blur-sm p-3 rounded-full text-white hover:bg-white/30 transition"
                                    >
                                        <X className="w-6 h-6" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={capturePhoto}
                                        className="w-16 h-16 rounded-full border-4 border-white bg-transparent flex items-center justify-center hover:bg-white/20 transition disabled:opacity-50"
                                    >
                                        <div className="w-12 h-12 bg-white rounded-full"></div>
                                    </button>
                                </div>
                            </div>
                        ) : imagePreview ? (
                            <div className="space-y-4">
                                <div className="relative rounded-xl overflow-hidden border border-border bg-card">
                                    <img
                                        src={imagePreview}
                                        alt="Preview"
                                        className="w-full h-48 object-cover"
                                    />
                                    {isScanning && (
                                        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center text-white z-20">
                                            <ScanLine className="w-8 h-8 animate-pulse mb-2" />
                                            <p className="text-sm font-medium">Analizando texto...</p>
                                        </div>
                                    )}
                                    <div className="absolute top-2 right-2 z-10">
                                        <button
                                            type="button"
                                            onClick={retakePhoto}
                                            className="bg-black/50 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 hover:bg-black/70 transition"
                                        >
                                            <RefreshCw className="w-3.5 h-3.5" />
                                            Repetir Foto
                                        </button>
                                    </div>
                                    {!isScanning && (
                                        <div className="p-2 bg-green-50/80 backdrop-blur-sm border-t border-green-100 flex items-center justify-center gap-2">
                                            <CheckCircle className="w-4 h-4 text-green-600" />
                                            <span className="text-xs font-bold text-green-700">Foto capturada</span>
                                        </div>
                                    )}
                                </div>

                                {/* OCR Candidates Selection */}
                                {activeTab === 'km' && !isScanning && ocrCandidates.length > 0 && (
                                    <div className="bg-muted/50 p-4 rounded-xl border border-border animate-in fade-in slide-in-from-top-2">
                                        <p className="text-sm font-medium mb-3 flex items-center gap-2">
                                            <ScanLine className="w-4 h-4 text-primary" />
                                            Valores detectados (Toca para seleccionar):
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {ocrCandidates.map((val, idx) => (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={() => selectCandidate(val)}
                                                    className={`px-4 py-2 rounded-lg text-sm font-bold border transition-all ${odometer === val
                                                        ? 'bg-primary text-primary-foreground border-primary shadow-md transform scale-105'
                                                        : 'bg-card text-card-foreground border-border hover:border-primary/50'
                                                        }`}
                                                >
                                                    {val}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={startCamera}
                                className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-primary/20 rounded-xl cursor-pointer hover:bg-primary/5 hover:border-primary/40 transition bg-card group"
                            >
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                        <Camera className="w-6 h-6 text-primary" />
                                    </div>
                                    <p className="text-sm font-semibold text-foreground">Activar Cámara</p>
                                    <p className="text-xs text-muted-foreground mt-1 text-center px-4">
                                        Detectar kilometraje automáticamente
                                    </p>
                                </div>
                            </button>
                        )}

                        {cameraError && (
                            <div className="mt-2 text-xs text-red-500 bg-red-50 p-2 rounded-lg border border-red-100 flex items-center gap-2">
                                <X className="w-4 h-4 shrink-0" />
                                {cameraError}
                            </div>
                        )}
                    </div>

                    <label className="block">
                        <span className="text-sm font-medium text-foreground">Notas (Opcional)</span>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full mt-1 px-4 py-3 bg-card border border-input rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition min-h-[80px]"
                            placeholder="Algún comentario adicional..."
                        ></textarea>
                    </label>

                    <button
                        type="submit"
                        disabled={loading || (!user?.assignedVehicleId && !selectedVehicleId)}
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                        ) : (
                            <>
                                <Save className="w-5 h-5" />
                                Guardar Registro
                            </>
                        )}
                    </button>
                </form>
            </main>
        </div>
    );
}
