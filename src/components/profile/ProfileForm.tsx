'use client';

import { useState } from 'react';
import { User } from '@/types';
import { updateItem, uploadFile } from '@/services/FirebaseService';
import { calculateProfileCompletion } from '@/utils/profileUtils';
import { Camera, Loader2, Save, User as UserIcon } from 'lucide-react';

interface ProfileFormProps {
    user: User;
    onUpdate?: () => void;
}

export const ProfileForm = ({ user, onUpdate }: ProfileFormProps) => {
    const [formData, setFormData] = useState({
        name: user.name || '',
        firstSurname: user.firstSurname || '',
        secondSurname: user.secondSurname || '',
        email: user.email || '',
        avatar: user.avatar || '',
    });

    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(user.avatar || '');

    const completion = calculateProfileCompletion({ ...user, ...formData });

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Por favor selecciona una imagen válida');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('La imagen no puede superar los 5MB');
            return;
        }

        try {
            setUploading(true);

            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewUrl(reader.result as string);
            };
            reader.readAsDataURL(file);

            // Upload to Firebase Storage
            const path = `avatars/${user.id}/${Date.now()}_${file.name}`;
            const downloadURL = await uploadFile(file, path);

            setFormData(prev => ({ ...prev, avatar: downloadURL }));
        } catch (error) {
            console.error('Error uploading avatar:', error);
            alert('Error al subir la imagen. Por favor intenta de nuevo.');
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!formData.name || formData.name.trim() === '') {
            alert('El nombre es obligatorio');
            return;
        }

        if (!formData.firstSurname || formData.firstSurname.trim() === '') {
            alert('El primer apellido es obligatorio');
            return;
        }

        try {
            if (uploading) {
                alert('Espera a que termine de subirse la imagen');
                return;
            }

            setSaving(true);
            console.log('Updating profile for user:', user.id);

            await updateItem('users', user.id!, {
                name: formData.name.trim(),
                firstSurname: formData.firstSurname.trim(),
                secondSurname: formData.secondSurname.trim(),
                avatar: formData.avatar,
            });

            console.log('Profile updated successfully');
            if (onUpdate) {
                onUpdate();
            }

            alert('Perfil actualizado correctamente');
        } catch (error: any) {
            console.error('Error updating profile:', error);
            alert(`Error al actualizar el perfil: ${error.message || 'Error desconocido'}`);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            {/* Profile Completion Bar */}
            <div className="bg-muted/30 p-4 border-b border-border">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">
                        Completitud del Perfil
                    </span>
                    <span className="text-sm font-bold text-foreground">
                        {completion}%
                    </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div
                        className="h-full bg-primary transition-all duration-500 ease-out"
                        style={{ width: `${completion}%` }}
                    />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                    {completion === 100
                        ? '¡Perfil completo! 🎉'
                        : 'Completa tu perfil para desbloquear todas las funcionalidades'}
                </p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Avatar Upload */}
                <div className="flex flex-col items-center gap-4">
                    <div className="relative group">
                        <div className="w-32 h-32 rounded-full overflow-hidden bg-muted border-4 border-border shadow-lg">
                            {previewUrl ? (
                                <img
                                    src={previewUrl}
                                    alt="Avatar"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                                    <UserIcon className="w-16 h-16 text-muted-foreground" />
                                </div>
                            )}
                        </div>

                        <label
                            htmlFor="avatar-upload"
                            className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full shadow-lg cursor-pointer hover:bg-primary/90 transition-colors"
                        >
                            {uploading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <Camera className="w-5 h-5" />
                            )}
                        </label>
                        <input
                            id="avatar-upload"
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarChange}
                            className="hidden"
                            disabled={uploading}
                        />
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                        Haz clic en el icono de cámara para cambiar tu foto
                        <br />
                        <span className="text-xs">(Máx. 5MB, JPG/PNG)</span>
                    </p>
                </div>

                {/* Name */}
                <div>
                    <label htmlFor="name" className="block text-sm font-semibold text-foreground mb-2">
                        Nombre <span className="text-destructive">*</span>
                    </label>
                    <input
                        id="name"
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        required
                        className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        placeholder="Juan"
                    />
                </div>

                {/* Surnames */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="firstSurname" className="block text-sm font-semibold text-foreground mb-2">
                            Primer Apellido <span className="text-destructive">*</span>
                        </label>
                        <input
                            id="firstSurname"
                            type="text"
                            value={formData.firstSurname}
                            onChange={(e) => setFormData(prev => ({ ...prev, firstSurname: e.target.value }))}
                            required
                            className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            placeholder="García"
                        />
                    </div>

                    <div>
                        <label htmlFor="secondSurname" className="block text-sm font-semibold text-foreground mb-2">
                            Segundo Apellido
                        </label>
                        <input
                            id="secondSurname"
                            type="text"
                            value={formData.secondSurname}
                            onChange={(e) => setFormData(prev => ({ ...prev, secondSurname: e.target.value }))}
                            className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            placeholder="López"
                        />
                    </div>
                </div>

                {/* Email (Read-only) */}
                <div>
                    <label htmlFor="email" className="block text-sm font-semibold text-foreground mb-2">
                        Email
                    </label>
                    <input
                        id="email"
                        type="email"
                        value={formData.email}
                        disabled
                        className="w-full px-4 py-3 bg-muted border border-border rounded-lg text-muted-foreground cursor-not-allowed"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                        El email no se puede modificar
                    </p>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end pt-4 border-t border-border">
                    <button
                        type="submit"
                        disabled={saving || uploading}
                        className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Guardando...
                            </>
                        ) : (
                            <>
                                <Save className="w-5 h-5" />
                                Guardar Cambios
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};
