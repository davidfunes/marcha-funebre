'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Logo } from '@/components/ui/Logo';
import { ShieldAlert, Eye, EyeOff, CheckCircle2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

function ResetPasswordForm() {
    const { verifyPasswordCode, confirmNewPassword } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const oobCode = searchParams.get('oobCode');

    // Form State
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [email, setEmail] = useState<string | null>(null);

    // UI State
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [verifying, setVerifying] = useState(true);
    const [success, setSuccess] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Verify code on mount
    useEffect(() => {
        const verifyCode = async () => {
            if (!oobCode) {
                setError('Código de recuperación no válido o expirado.');
                setVerifying(false);
                return;
            }

            try {
                const userEmail = await verifyPasswordCode(oobCode);
                setEmail(userEmail);
            } catch (err: any) {
                console.error("Error verifying code:", err);
                setError('El enlace de recuperación no es válido o ya ha sido utilizado.');
            } finally {
                setVerifying(false);
            }
        };

        verifyCode();
    }, [oobCode, verifyPasswordCode]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!oobCode) return;

        setError('');

        // Validations
        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden.');
            return;
        }

        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres.');
            return;
        }

        setLoading(true);

        try {
            await confirmNewPassword(oobCode, password);
            setSuccess(true);
            // Redirect after 3 seconds
            setTimeout(() => {
                router.push('/login');
            }, 3000);
        } catch (err: any) {
            console.error("Error resetting password:", err);
            setError(err.message || 'No se pudo restablecer la contraseña. Inténtalo de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    if (verifying) {
        return (
            <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin h-8 w-8 text-primary mb-4" />
                <p className="text-gray-500 font-medium">Verificando código...</p>
            </div>
        );
    }

    if (success) {
        return (
            <div className="text-center py-8 animate-in fade-in slide-in-from-bottom-4">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="w-10 h-10" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Contraseña Actualizada!</h2>
                <p className="text-gray-600 mb-8 leading-relaxed">
                    Tu contraseña ha sido restablecida correctamente. <br />
                    Serás redirigido al inicio de sesión en unos segundos.
                </p>
                <Link
                    href="/login"
                    className="inline-flex items-center gap-2 text-primary font-semibold hover:underline"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Ir al inicio de sesión ahora
                </Link>
            </div>
        );
    }

    return (
        <div className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-2xl p-8 shadow-xl ring-1 ring-gray-900/5">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Nueva Contraseña</h2>
            <p className="text-sm text-gray-500 mb-8">
                {email ? `Establece una nueva contraseña para ${email}` : 'Introduce tu nueva contraseña a continuación.'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                    <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">
                        Contraseña Nueva
                    </label>
                    <div className="relative">
                        <input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
                            placeholder="••••••••"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 p-1"
                        >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">
                        Confirmar Contraseña
                    </label>
                    <input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
                        placeholder="••••••••"
                    />
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-start gap-3">
                        <ShieldAlert className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        <p className="text-red-600 text-sm font-medium">{error}</p>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading || !!error}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3.5 rounded-xl shadow-lg shadow-primary/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {loading ? (
                        <div className="animate-spin h-5 w-5 border-2 border-white/30 border-t-white rounded-full" />
                    ) : 'Actualizar Contraseña'}
                </button>
            </form>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50/50 p-4 relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
                <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/10 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
            </div>

            <div className="w-full max-w-md relative z-10">
                <div className="text-center mb-8 flex flex-col items-center">
                    <Logo size="xl" layout="vertical" className="mb-4" />
                    <h1 className="text-gray-400 text-xs font-bold uppercase tracking-widest">
                        Seguridad de Cuenta
                    </h1>
                </div>

                <Suspense fallback={
                    <div className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-2xl p-12 text-center shadow-xl">
                        <div className="animate-spin h-8 w-8 text-primary mx-auto mb-4" />
                        <p className="text-gray-500 font-medium">Cargando...</p>
                    </div>
                }>
                    <ResetPasswordForm />
                </Suspense>

                <div className="text-center mt-8">
                    <p className="text-xs text-gray-400 font-medium">© 2025 Marcha Fúnebre</p>
                </div>
            </div>
        </div>
    );
}
