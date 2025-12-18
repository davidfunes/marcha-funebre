'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase/firebase';
import { collection, addDoc, doc, updateDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import {
    Settings,
    Camera,
    Save,
    ArrowLeft,
    CheckCircle,
    Car,
    X,
    RefreshCw,
    ScanLine,
    Gauge
} from 'lucide-react';
import Link from 'next/link';
import { Vehicle } from '@/types';
import { createWorker } from 'tesseract.js';
import { awardPointsForAction } from '@/services/GamificationService';

export default function LogKmPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    // Vehicle Selection State
    const [availableVehicles, setAvailableVehicles] = useState<Vehicle[]>([]);
    const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
    const [isLoadingVehicles, setIsLoadingVehicles] = useState(false);

    // Form States
    const [odometer, setOdometer] = useState('');
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
                setSelectedVehicleId(user.assignedVehicleId);
            }
        };
        fetchVehicles();
    }, [user]);

    useEffect(() => {
        return () => stopCamera();
    }, []);

    useEffect(() => {
        if (isCameraOpen && videoRef.current && streamRef.current) {
            videoRef.current.srcObject = streamRef.current;
        }
    }, [isCameraOpen]);

    const startCamera = async () => {
        setCameraError('');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });
            streamRef.current = stream;
            setIsCameraOpen(true);
        } catch (err) {
            console.error("Error accessing camera:", err);
            setCameraError('No se pudo acceder a la cámara. Revisa los permisos.');
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        setIsCameraOpen(false);
    };

    const preprocessImage = (canvas: HTMLCanvasElement) => {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Convert to grayscale and increase contrast (simple binarization)
        // This helps Tesseract read digits better on LCD screens
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            // Luminance formula
            let gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;

            // Simple thresholding for high contrast
            // Threshold can be adjusted. 128 is mid-gray.
            // Using a slightly smarter approach: contrast stretching could be better,
            // but let's try pushing values to extremes for cleaner text.
            const threshold = 100;
            gray = gray > threshold ? 255 : 0;

            data[i] = gray;
            data[i + 1] = gray;
            data[i + 2] = gray;
        }

        ctx.putImageData(imageData, 0, 0);
    };

    const processImageWithOCR = async (imageBlob: Blob) => {
        setIsScanning(true);
        setOcrCandidates([]);
        try {
            const worker = await createWorker('eng');

            // Whitelist for digits only to avoid noise
            await worker.setParameters({
                tessedit_char_whitelist: '0123456789',
            });

            const result = await worker.recognize(imageBlob);
            await worker.terminate();

            const text = result.data.text;
            console.log("OCR Raw Text:", text);

            const matches = text.match(/\d+/g);

            if (matches && matches.length > 0) {
                const validCandidates = matches
                    .filter(val => {
                        const num = parseFloat(val);
                        // Filter unreasonable numbers (e.g., typically kms are > 10 and < 1M for a car)
                        // A brand new car might have 0, so let's allow >= 0 but be reasonable.
                        return !isNaN(num) && num < 2000000;
                    });

                if (validCandidates.length > 0) {
                    const uniqueCandidates = Array.from(new Set(validCandidates))
                        .sort((a, b) => parseFloat(b) - parseFloat(a)); // Descending order usually best for Odometer (largest number)

                    setOcrCandidates(uniqueCandidates);

                    // If we found a very likely candidate (e.g. 5-6 digits), auto-fill
                    const likelyOdometer = uniqueCandidates.find(c => c.length >= 4 && c.length <= 7);
                    if (likelyOdometer) {
                        setOdometer(likelyOdometer);
                    } else if (uniqueCandidates.length > 0) {
                        setOdometer(uniqueCandidates[0]);
                    }
                }
            } else {
                console.log("No detected valid numbers");
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
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                context.drawImage(video, 0, 0, canvas.width, canvas.height);

                // Save original for preview
                const dataUrl = canvas.toDataURL('image/jpeg');
                setImagePreview(dataUrl);

                // Create a clone canvas for processing to not affect the preview (optional, but good practice)
                // For now, we process the hidden canvas and then extract blob
                preprocessImage(canvas);

                canvas.toBlob((blob) => {
                    if (blob) {
                        const file = new File([blob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
                        setImage(file);
                        stopCamera();
                        processImageWithOCR(blob);
                    }
                }, 'image/jpeg', 0.9);
            }
        }
    };

    const retakePhoto = () => {
        setImage(null);
        setImagePreview(null);
        setOdometer('');
        setOcrCandidates([]);
        startCamera();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const targetVehicleId = user?.assignedVehicleId || selectedVehicleId;
        if (!targetVehicleId) {
            alert('Selecciona un vehículo o comprueba tu asignación.');
            return;
        }

        if (!odometer) {
            alert('Por favor indica los kilómetros.');
            return;
        }

        setLoading(true);
        try {
            // 1. Log Entry
            await addDoc(collection(db, 'logs'), {
                userId: user!.id,
                vehicleId: targetVehicleId,
                date: serverTimestamp(),
                type: 'km',
                value: Number(odometer),
                notes,
                imageUrl: image ? 'https://simulate-url.com/receipt.jpg' : null, // TODO: Real storage
                createdAt: serverTimestamp()
            });

            // 2. Update Vehicle Odometer
            await updateDoc(doc(db, 'vehicles', targetVehicleId), {
                odometer: Number(odometer),
                updatedAt: serverTimestamp()
            });

            // 3. Points
            if (user!.id) {
                await awardPointsForAction(user!.id, 'log_km');
            }

            setSuccess(true);
            setTimeout(() => {
                router.push('/driver/dashboard');
            }, 2000);

        } catch (error) {
            console.error('Error saving log:', error);
            alert('Error al guardar.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 animate-in fade-in zoom-in duration-300">
                <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-green-500/20">
                    <CheckCircle className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-3xl font-bold mb-2">¡Kilómetros Registrados!</h1>
                <div className="bg-yellow-500/10 px-6 py-3 rounded-full border border-yellow-500/20 text-yellow-600 font-bold text-lg animate-bounce mt-4">
                    Puntos añadidos
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pb-20">
            <div className="bg-card border-b border-border sticky top-0 z-10 px-4 py-4 flex items-center gap-4">
                <Link href="/driver/dashboard" className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors">
                    <ArrowLeft className="w-6 h-6" />
                </Link>
                <h1 className="text-xl font-bold font-display">Registrar Kilometraje</h1>
            </div>

            <main className="p-4 max-w-lg mx-auto">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Vehicle Selection Logic */}
                    {!user?.assignedVehicleId && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Vehículo</label>
                            {isLoadingVehicles ? (
                                <div className="h-12 w-full bg-muted animate-pulse rounded-xl"></div>
                            ) : (
                                <div className="relative">
                                    <Car className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                                    <select
                                        value={selectedVehicleId}
                                        onChange={(e) => setSelectedVehicleId(e.target.value)}
                                        required
                                        className="w-full pl-12 pr-4 py-3 bg-card border border-input rounded-xl outline-none"
                                    >
                                        <option value="">-- Seleccionar --</option>
                                        {availableVehicles.map(v => (
                                            <option key={v.id} value={v.id}>{v.brand} {v.model} - {v.plate}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="space-y-4">
                        <label className="block">
                            <span className="text-sm font-medium mb-1 block">¿Cuántos KM marca el contador?</span>
                            <div className="relative">
                                <Gauge className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                                <input
                                    type="number"
                                    required
                                    value={odometer}
                                    onChange={(e) => setOdometer(e.target.value)}
                                    className="w-full pl-12 pr-12 py-4 bg-card border border-input rounded-xl focus:ring-2 focus:ring-primary outline-none transition text-2xl font-mono font-bold tracking-widest"
                                    placeholder="000000"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">KM</span>
                                {isScanning && (
                                    <div className="absolute right-14 top-1/2 -translate-y-1/2">
                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>
                                    </div>
                                )}
                            </div>
                        </label>
                    </div>

                    {/* Camera Section */}
                    <div>
                        <span className="text-sm font-medium mb-2 block">Foto del Marcador (OCR Inteligente)</span>
                        {isCameraOpen ? (
                            <div className="relative rounded-xl overflow-hidden bg-black aspect-[4/3] shadow-lg">
                                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                                <canvas ref={canvasRef} className="hidden" />
                                <div className="absolute bottom-4 inset-x-0 flex justify-center gap-6 items-center z-20">
                                    <button type="button" onClick={stopCamera} className="bg-black/40 backdrop-blur p-3 rounded-full text-white">
                                        <X className="w-6 h-6" />
                                    </button>
                                    <button type="button" onClick={capturePhoto} className="w-16 h-16 rounded-full border-4 border-white bg-white/20 flex items-center justify-center">
                                        <div className="w-12 h-12 bg-white rounded-full"></div>
                                    </button>
                                </div>
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4/5 h-24 border-2 border-green-400/50 rounded-lg pointer-events-none">
                                    <p className="text-green-400 text-xs text-center -mt-6 font-bold shadow-black drop-shadow-md">Centrar números aquí</p>
                                </div>
                            </div>
                        ) : imagePreview ? (
                            <div className="space-y-4">
                                <div className="relative rounded-xl overflow-hidden border border-border bg-card">
                                    <img src={imagePreview} alt="Preview" className="w-full h-48 object-cover opacity-80" />

                                    {isScanning && (
                                        <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center text-white p-4 text-center">
                                            <ScanLine className="w-10 h-10 animate-pulse text-primary mb-3" />
                                            <p className="font-bold">Analizando imagen...</p>
                                            <p className="text-xs text-gray-300 mt-1">Mejorando contraste y leyendo dígitos</p>
                                        </div>
                                    )}

                                    <div className="absolute top-2 right-2 z-10">
                                        <button type="button" onClick={retakePhoto} className="bg-black/60 backdrop-blur text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-black/80">
                                            <RefreshCw className="w-3.5 h-3.5" />
                                            Repetir
                                        </button>
                                    </div>
                                </div>

                                {/* OCR Results */}
                                {!isScanning && ocrCandidates.length > 0 && (
                                    <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
                                        <p className="text-xs font-bold text-primary uppercase mb-3 flex items-center gap-2">
                                            <ScanLine className="w-4 h-4" />
                                            Números detectados (Toca para usar)
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {ocrCandidates.map((val, idx) => (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={() => setOdometer(val)}
                                                    className={`px-3 py-2 rounded-md text-sm font-mono font-bold border transition-all ${odometer === val
                                                        ? 'bg-primary text-primary-foreground border-primary ring-2 ring-primary ring-offset-1'
                                                        : 'bg-card hover:bg-muted border-border'}`}
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
                                className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-input rounded-xl hover:bg-muted/50 transition duration-200 group"
                            >
                                <Camera className="w-8 h-8 text-muted-foreground group-hover:text-primary mb-2 transition-colors" />
                                <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground">Abrir Cámara</span>
                            </button>
                        )}
                        {cameraError && <p className="text-red-500 text-xs mt-2">{cameraError}</p>}
                    </div>

                    <label className="block">
                        <span className="text-sm font-medium mb-1 block">Notas (Opcional)</span>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full px-4 py-3 bg-card border border-input rounded-xl outline-none min-h-[80px]"
                            placeholder="Comentarios sobre el viaje..."
                        ></textarea>
                    </label>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/50 border-t-white"></div> : <><Save className="w-5 h-5" /> Guardar Kilometraje</>}
                    </button>
                </form>
            </main>
        </div>
    );
}
