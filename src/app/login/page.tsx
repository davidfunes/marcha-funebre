'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Logo } from '@/components/ui/Logo';
import { ShieldAlert, Send, X, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { blockUserByEmailAction } from '@/app/actions/authActions';
export default function LoginPage() {
    const { signIn, signUp, user } = useAuth();
    const router = useRouter();

    // Form State
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [firstSurname, setFirstSurname] = useState('');
    const [secondSurname, setSecondSurname] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // UI State
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Security State
    const [honeypot, setHoneypot] = useState(''); // Anti-bot
    const [captchaChallenge, setCaptchaChallenge] = useState({ num1: 0, num2: 0 });
    const [captchaInput, setCaptchaInput] = useState('');

    // Lockout State
    const [failedAttempts, setFailedAttempts] = useState(0);
    const [showLockoutModal, setShowLockoutModal] = useState(false);
    const [contactMessage, setContactMessage] = useState('');
    const [messageSent, setMessageSent] = useState(false);
    const [sendingMessage, setSendingMessage] = useState(false);

    const handleSendContactMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Sending lockout message...', { email, contactMessage });
        setSendingMessage(true);
        try {
            const docRef = await addDoc(collection(db, 'admin_messages'), {
                email: email,
                content: contactMessage,
                type: 'lockout',
                timestamp: serverTimestamp(),
                read: false,
                status: 'pending_review'
            });
            console.log('Message sent successfully! ID:', docRef.id);
            setMessageSent(true);
            setContactMessage('');
            setSendingMessage(false);
        } catch (err: any) {
            console.error("Error sending message:", err);
            alert(`Error: ${err.message || 'No se pudo enviar el mensaje'}`);
            setSendingMessage(false);
        }
    };

    // Init Captcha on mount
    useEffect(() => {
        setCaptchaChallenge({
            num1: Math.floor(Math.random() * 10) + 1,
            num2: Math.floor(Math.random() * 10) + 1
        });
    }, [isLogin]);

    useEffect(() => {
        if (user) {
            if (user.status === 'blocked' || user.status === 'rejected' || user.status === 'pending') {
                return;
            }

            if (user.role === 'admin') {
                router.push('/admin/dashboard');
            } else if (user.role === 'conductor') {
                router.push('/driver/dashboard');
            }
        }
    }, [user, router]);

    // Reset failed attempts when email changes (different user)
    useEffect(() => {
        setFailedAttempts(0);
        setShowLockoutModal(false);
    }, [email]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (failedAttempts >= 3 && isLogin) {
            setShowLockoutModal(true);
            return;
        }

        setError('');
        setLoading(true);

        try {
            if (isLogin) {
                await signIn(email.trim(), password);
                // Reset attempts on successful login
                setFailedAttempts(0);
            } else {
                // Security Checks
                if (honeypot) {
                    console.warn("Bot verification failed: Honeypot filled");
                    await new Promise(r => setTimeout(r, 1000));
                    throw new Error('Error de validación. Inténtalo de nuevo.');
                }

                if (parseInt(captchaInput) !== (captchaChallenge.num1 + captchaChallenge.num2)) {
                    throw new Error('Verificación incorrecta. Por favor resuelve la suma.');
                }

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
                if (!firstSurname.trim()) {
                    throw new Error('El primer apellido es obligatorio');
                }

                await signUp(email.trim(), password, name.trim(), firstSurname.trim(), secondSurname.trim(), 'conductor');
                // Reset attempts on successful registration
                setFailedAttempts(0);
                router.push('/pending');
            }
        } catch (err: any) {
            const isLogicError = err.message && (
                err.message.includes('contraseña') ||
                err.message.includes('nombre') ||
                err.message.includes('apellido') ||
                err.message.includes('email') ||
                err.message === 'user-not-found-in-db' ||
                err.message === 'user-pending' ||
                err.message === 'user-blocked' ||
                err.message === 'user-inactive' ||
                err.message === 'user-rejected'
            );

            const isKnownAuthError = [
                'auth/invalid-credential',
                'auth/user-not-found',
                'auth/wrong-password',
                'auth/email-already-in-use'
            ].includes(err.code);

            if (!isLogicError && !isKnownAuthError && !err.code) {
                console.error('Auth error:', err);
            }

            if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/too-many-requests') {
                if (isLogin) {
                    const newAttempts = failedAttempts + 1;
                    setFailedAttempts(newAttempts);
                    if (newAttempts >= 3) {
                        setShowLockoutModal(true);
                        setError('Has superado el límite de intentos. Cuenta bloqueada temporalmente.');
                        // Attempt to block user in DB server-side
                        blockUserByEmailAction(email).catch(err => console.error('Failed to auto-block user:', err));
                    } else {
                        const remaining = 3 - newAttempts;
                        setError(`Credenciales incorrectas. Te quedan ${remaining} intento${remaining !== 1 ? 's' : ''} antes del bloqueo.`);
                    }
                } else {
                    setError('Contraseña incorrecta.');
                }
            } else if (err.code === 'auth/user-not-found') {
                setError('El usuario no existe.');
            } else if (err.code === 'auth/email-already-in-use') {
                setError('El email ya está registrado. Prueba a iniciar sesión.');
            } else if (err.message === 'user-not-found-in-db') {
                setError('El usuario no existe.');
            } else if (err.message === 'user-pending') {
                setError('El usuario está pendiente de aprobación.');
            } else if (err.message === 'user-blocked') {
                setError('Acceso denegado. Tu cuenta ha sido bloqueada permanentemente.');
            } else if (err.message === 'user-rejected') {
                setError('Lo sentimos, tu solicitud de acceso fue rechazada. Si crees que es un error o quieres volver a intentarlo, por favor regístrate de nuevo.');
            } else if (err.message === 'user-inactive') {
                setError('El usuario está inactivo. Contacta con un administrador.');
            } else if (err.message) {
                setError(err.message);
            } else {
                setError('Error de autenticación.');
            }
        } finally {
            setLoading(false);
        }
    };

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
                            <>
                                {/* Honeypot - hidden from real users */}
                                <div className="hidden absolute inset-0 -z-50 opacity-0 pointer-events-none">
                                    <label htmlFor="website">Website</label>
                                    <input
                                        id="website"
                                        type="text"
                                        value={honeypot}
                                        onChange={(e) => setHoneypot(e.target.value)}
                                        tabIndex={-1}
                                        autoComplete="off"
                                    />
                                </div>

                                {/* Custom Math Captcha */}
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-4">
                                    <label htmlFor="captcha" className="block text-sm font-semibold text-gray-700 mb-2">
                                        Verificación de Seguridad
                                    </label>
                                    <div className="flex items-center gap-3">
                                        <div className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-lg font-mono font-bold tracking-widest text-gray-600">
                                            {captchaChallenge.num1} + {captchaChallenge.num2} = ?
                                        </div>
                                        <input
                                            id="captcha"
                                            type="number"
                                            value={captchaInput}
                                            onChange={(e) => setCaptchaInput(e.target.value)}
                                            required={!isLogin}
                                            className="w-24 px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-center font-bold"
                                            placeholder="?"
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        Resuelve la suma para verificar que eres humano.
                                    </p>
                                </div>

                                <div>
                                    <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">
                                        Nombre
                                    </label>
                                    <input
                                        id="name"
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required={!isLogin}
                                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
                                        placeholder="Juan"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="firstSurname" className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">
                                            Primer Apellido <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            id="firstSurname"
                                            type="text"
                                            value={firstSurname}
                                            onChange={(e) => setFirstSurname(e.target.value)}
                                            required={!isLogin}
                                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
                                            placeholder="García"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="secondSurname" className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">
                                            Segundo Apellido
                                        </label>
                                        <input
                                            id="secondSurname"
                                            type="text"
                                            value={secondSurname}
                                            onChange={(e) => setSecondSurname(e.target.value)}
                                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
                                            placeholder="López"
                                        />
                                    </div>
                                </div>
                            </>
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
                            <div className="bg-red-50 border border-red-100 rounded-xl p-4 animate-in fade-in slide-in-from-top-2 flex items-start gap-3">
                                <div className="text-red-500 mt-0.5 shrink-0">
                                    <ShieldAlert className="w-5 h-5" />
                                </div>
                                <p className="text-red-600 text-sm font-medium whitespace-pre-line leading-relaxed">{error}</p>
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

                {/* Lockout / Contact Admin Modal */}
                {showLockoutModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3 text-red-600">
                                        <div className="p-2 bg-red-100 rounded-lg">
                                            <ShieldAlert className="w-6 h-6" />
                                        </div>
                                        <h3 className="font-bold text-lg">Cuenta Bloqueada</h3>
                                    </div>
                                    <button
                                        onClick={() => setShowLockoutModal(false)}
                                        className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-full transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                {!messageSent ? (
                                    <>
                                        <p className="text-gray-600 text-sm mb-4 leading-relaxed">
                                            Has introducido la contraseña incorrectamente 3 veces. Por seguridad, tu cuenta ha pasado a estado inactivo temporalmente.
                                            <br /><br />
                                            Por favor, contacta con el administrador para desbloquearla.
                                        </p>

                                        <form onSubmit={handleSendContactMessage}>
                                            <textarea
                                                value={contactMessage}
                                                onChange={(e) => setContactMessage(e.target.value)}
                                                placeholder="Escribe un mensaje al administrador explicando la situación..."
                                                className="w-full h-32 p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none resize-none mb-4"
                                                required
                                            />
                                            <button
                                                type="submit"
                                                disabled={sendingMessage}
                                                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-2"
                                            >
                                                {sendingMessage ? (
                                                    <>
                                                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                        </svg>
                                                        Enviando...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Send className="w-4 h-4" />
                                                        Enviar Mensaje
                                                    </>
                                                )}
                                            </button>
                                        </form>
                                    </>
                                ) : (
                                    <div className="text-center py-8 animate-in fade-in slide-in-from-bottom-4">
                                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <CheckCircle2 className="w-8 h-8" />
                                        </div>
                                        <h4 className="text-xl font-bold text-gray-900 mb-2">¡Mensaje Enviado!</h4>
                                        <p className="text-gray-600 mb-6">
                                            El administrador ha recibido tu mensaje y revisará tu caso lo antes posible.
                                        </p>
                                        <button
                                            onClick={() => {
                                                setShowLockoutModal(false);
                                                setMessageSent(false);
                                            }}
                                            className="bg-gray-900 text-white font-medium py-2.5 px-6 rounded-xl hover:bg-gray-800 transition-colors"
                                        >
                                            Cerrar
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
