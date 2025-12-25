'use client';

import React, { useState, useRef } from 'react';
import { Camera, Image as ImageIcon, Upload, X, Loader2 } from 'lucide-react';
import { uploadFile } from '@/services/FirebaseService';
import { cn } from '@/lib/utils';

interface ImageUploadProps {
    value?: string;
    onChange: (url: string) => void;
    folder?: string;
    className?: string;
    label?: string;
}

export function ImageUpload({
    value,
    onChange,
    folder = 'vehicles',
    className,
    label = 'Foto del Vehículo'
}: ImageUploadProps) {
    const [uploading, setUploading] = useState(false);
    const [preview, setPreview] = useState<string | null>(value || null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validations
        if (!file.type.startsWith('image/')) {
            alert('Por favor selecciona una imagen válida');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            alert('La imagen no puede pesar más de 10MB');
            return;
        }

        try {
            setUploading(true);

            // Instant local preview
            const objectUrl = URL.createObjectURL(file);
            setPreview(objectUrl);

            // Upload to Storage
            const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
            const path = `${folder}/${fileName}`;
            const downloadUrl = await uploadFile(file, path);

            onChange(downloadUrl);
        } catch (error) {
            console.error('Error uploading image:', error);
            alert('Error al subir la imagen. Por favor intenta de nuevo.');
            setPreview(value || null); // Revert preview on error
        } finally {
            setUploading(false);
        }
    };

    const handleRemove = (e: React.MouseEvent) => {
        e.stopPropagation();
        setPreview(null);
        onChange('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleClickArea = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className={cn("space-y-2", className)}>
            {label && <label className="text-sm font-medium">{label}</label>}

            <div
                onClick={handleClickArea}
                className={cn(
                    "relative border-2 border-dashed rounded-xl transition-all cursor-pointer overflow-hidden aspect-video flex items-center justify-center",
                    preview ? "border-primary/50 bg-muted/30" : "border-border hover:border-primary/50 hover:bg-muted/50",
                    uploading && "opacity-70 pointer-events-none"
                )}
            >
                {preview ? (
                    <>
                        <img
                            src={preview}
                            alt="Preview"
                            className="absolute inset-0 w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/20 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                            <div className="bg-white/90 p-2 rounded-full shadow-lg">
                                <Upload className="h-5 w-5 text-primary" />
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={handleRemove}
                            className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors z-10"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </>
                ) : (
                    <div className="flex flex-col items-center gap-2 p-6 text-muted-foreground">
                        <div className="p-3 bg-muted rounded-full">
                            <Camera className="h-8 w-8" />
                        </div>
                        <div className="text-center">
                            <p className="font-medium text-sm">Hacer foto o subir imagen</p>
                            <p className="text-xs">Galería o Cámara</p>
                        </div>
                    </div>
                )}

                {uploading && (
                    <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex flex-col items-center justify-center gap-2 z-20">
                        <Loader2 className="h-8 w-8 text-primary animate-spin" />
                        <p className="text-xs font-medium">Subiendo...</p>
                    </div>
                )}
            </div>

            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
                capture="environment" // Forces back camera on some mobile browsers
            />
        </div>
    );
}
