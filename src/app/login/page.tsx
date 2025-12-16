'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Logo } from '@/components/ui/Logo';
import { Car } from 'lucide-react';

export default function LoginPage() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { signIn, signUp, user, firebaseUser } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (user) {
            if (user.role === 'admin') {
                router.push('/admin/dashboard');
            } else if (user.role === 'conductor') {
                router.push('/driver/dashboard');
            }
        }
    }, [user, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isLogin) {
                await signIn(email.trim(), password);
            } else {
                // Registration validations
                if (password !== confirmPassword) {
                    throw new Error('Las contraseñas no coinciden');
                }
                if (password.length < 6) {
                    throw new Error('La contraseña debe tener al menos 6 caracteres');
                }
                if (!name.trim()) {
                    throw new Error('El nombre es obligatorio');
                }

                // Default to 'conductor' as requested (Admins created via DB/Console)
                await signUp(email.trim(), password, name.trim(), 'conductor');
            }
            // Redirect will be handled by the auth context/effect
        } catch (err: any) {
            // Only log actual system errors, not validation messages
            if (err.code || (err.message && !err.message.includes('contraseña') && !err.message.includes('nombre') && !err.message.includes('email'))) {
                console.error('Auth error:', err);
            }

            if (err.code === 'auth/invalid-credential') {
                setError('Credenciales incorrectas.');
            } else if (err.code === 'auth/user-not-found') {
                setError('Usuario no encontrado.');
            } else if (err.code === 'auth/wrong-password') {
                setError('Contraseña incorrecta.');
            } else if (err.code === 'auth/email-already-in-use') {
                setError('El email ya está registrado. Prueba a iniciar sesión.');
            } else if (err.message) {
                setError(err.message);
            } else {
                setError('Error de autenticación.');
            }
        } finally {
            setLoading(false);
        }
    };

    // ... omitted

    return (

        <div className="min-h-screen flex items-center justify-center bg-gray-50/50 p-4 relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
                <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/10 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
            </div>

            <div className="w-full max-w-md relative z-10 animate-in fade-in zoom-in duration-500">
                {/* Logo and Title */}
                <div className="text-center mb-8 flex flex-col items-center">
                    <Logo size="2xl" layout="vertical" className="mb-6 drop-shadow-sm" />
                    <p className="text-muted-foreground mt-2 font-medium tracking-wide text-sm uppercase">
                        Gestión de Flota y Material Musical
                    </p>
                </div>

                {/* Auth Form */}
                <div className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-2xl p-8 shadow-xl ring-1 ring-gray-900/5">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {!isLogin && (
                            <div>
                                <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">
                                    Nombre Completo
                                </label>
                                <input
                                    id="name"
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required={!isLogin}
                                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
                                    placeholder="Ej. Juan Pérez"
                                />
                            </div>
                        )}

                        <div>
                            <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">
                                Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
                                placeholder="tu@email.com"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">
                                Contraseña
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
                                placeholder="••••••••"
                            />
                        </div>

                        {!isLogin && (
                            <div>
                                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">
                                    Confirmar Contraseña
                                </label>
                                <input
                                    id="confirmPassword"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required={!isLogin}
                                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
                                    placeholder="••••••••"
                                />
                            </div>
                        )}

                        {error && (
                            <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-start gap-3">
                                <div className="text-red-500 mt-0.5">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <p className="text-red-600 text-sm font-medium">{error}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all duration-200 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none mt-2"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Procesando...
                                </span>
                            ) : (isLogin ? 'Iniciar Sesión' : 'Registrarse')}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-gray-100/80 text-center">
                        <button
                            type="button"
                            onClick={() => {
                                setIsLogin(!isLogin);
                                setError('');
                            }}
                            className="text-sm text-primary font-medium hover:text-primary/80 transition-colors inline-flex items-center gap-1 group"
                        >
                            {isLogin ? (
                                <>
                                    ¿No tienes cuenta? <span className="underline decoration-2 underline-offset-2 decoration-transparent group-hover:decoration-primary/30 transition-all">Regístrate ahora</span>
                                </>
                            ) : (
                                <>
                                    ¿Ya tienes cuenta? <span className="underline decoration-2 underline-offset-2 decoration-transparent group-hover:decoration-primary/30 transition-all">Inicia sesión</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                <div className="text-center mt-8 space-y-1">
                    <p className="text-xs text-gray-400 font-medium">© 2025 Marcha Fúnebre. v0.1.0</p>
                </div>
            </div>
        </div>
    );
}
