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
    const { signIn, signUp, user } = useAuth();
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
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="w-full max-w-md">
                {/* Logo and Title */}
                <div className="text-center mb-8 flex flex-col items-center">
                    <Logo size="2xl" className="mb-4" />
                    <p className="text-muted-foreground mt-2">
                        Gestión de Flota y Material Musical
                    </p>
                </div>

                {/* Auth Form */}
                <div className="bg-card border border-border rounded-xl p-8 shadow-sm">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {!isLogin && (
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
                                    Nombre Completo
                                </label>
                                <input
                                    id="name"
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required={!isLogin}
                                    className="w-full px-4 py-3 bg-background border border-input rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
                                    placeholder="Tu Nombre"
                                />
                            </div>
                        )}

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                                Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full px-4 py-3 bg-background border border-input rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
                                placeholder="tu@email.com"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
                                Contraseña
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full px-4 py-3 bg-background border border-input rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
                                placeholder="••••••••"
                            />
                        </div>

                        {!isLogin && (
                            <div>
                                <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-2">
                                    Confirmar Contraseña
                                </label>
                                <input
                                    id="confirmPassword"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required={!isLogin}
                                    className="w-full px-4 py-3 bg-background border border-input rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
                                    placeholder="••••••••"
                                />
                            </div>
                        )}

                        {error && (
                            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-destructive text-sm font-medium">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Procesando...' : (isLogin ? 'Iniciar Sesión' : 'Registrarse')}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <button
                            type="button"
                            onClick={() => {
                                setIsLogin(!isLogin);
                                setError('');
                            }}
                            className="text-sm text-primary hover:underline font-medium"
                        >
                            {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
                        </button>
                    </div>
                </div>

                <div className="text-center mt-6 text-sm text-muted-foreground space-y-1">
                    <p>© 2025 Marcha Fúnebre. Todos los derechos reservados.</p>
                    <p>Desarrollado por David Funes</p>
                    <p className="text-xs opacity-70">Versión 0.1.0</p>
                </div>
            </div>
        </div>
    );
}
