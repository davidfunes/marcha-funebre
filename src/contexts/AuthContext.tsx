'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
    User as FirebaseUser,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut as firebaseSignOut,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    confirmPasswordReset,
    verifyPasswordResetCode
} from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/firebase';
import { User, UserRole } from '@/types';

interface AuthContextType {
    user: User | null;
    firebaseUser: FirebaseUser | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string, name: string, firstSurname: string, secondSurname: string, role: UserRole) => Promise<void>;
    signOut: () => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
    confirmNewPassword: (code: string, password: string) => Promise<void>;
    verifyPasswordCode: (code: string) => Promise<string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    // ... items omitted (useState, useEffect remain same) ...
    const [user, setUser] = useState<User | null>(null);
    const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // ... (useEffect remains same) ...
        let userUnsubscribe: (() => void) | null = null;

        const authUnsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            setFirebaseUser(firebaseUser);

            if (userUnsubscribe) {
                userUnsubscribe();
                userUnsubscribe = null;
            }

            if (firebaseUser) {
                try {
                    userUnsubscribe = onSnapshot(doc(db, 'users', firebaseUser.uid),
                        (docSnapshot) => {
                            if (docSnapshot.exists()) {
                                setUser({ id: firebaseUser.uid, ...docSnapshot.data() } as User);
                            } else {
                                console.log('Waiting for user profile creation or recovery for UID:', firebaseUser.uid);
                                setUser(null);
                            }
                            setLoading(false);
                        },
                        (error) => {
                            // Ignore permission errors that happen during logout/auth persistence check
                            if (error.code === 'permission-denied') {
                                console.log('Permission denied for user profile (likely due to logout/auth state change). Ignoring.');
                            } else {
                                console.error('Error listening to user profile:', error);
                            }
                            setUser(null);
                            setLoading(false);
                        }
                    );
                } catch (error) {
                    console.error('Error setting up user listener:', error);
                    setLoading(false);
                }
            } else {
                console.log('No user logged in');
                setUser(null);
                setLoading(false);
            }
        });

        return () => {
            authUnsubscribe();
            if (userUnsubscribe) {
                userUnsubscribe();
            }
        };
    }, []);

    // ... (Session Inactivity remains same) ...
    // Session Inactivity Timeout
    useEffect(() => {
        if (!user || !firebaseUser) return;
        const INACTIVITY_TIMEOUT = 30 * 60 * 1000;
        const STORAGE_KEY = 'auth_last_activity';
        let timeoutId: NodeJS.Timeout;
        const lastActiveStr = localStorage.getItem(STORAGE_KEY);
        if (lastActiveStr) {
            const lastActive = parseInt(lastActiveStr, 10);
            if (Date.now() - lastActive > INACTIVITY_TIMEOUT) {
                console.log('Session expired based on persistent storage');
                signOut();
                return;
            }
        } else {
            const lastSignIn = firebaseUser.metadata.lastSignInTime;
            if (lastSignIn) {
                const lastSignInTime = new Date(lastSignIn).getTime();
                if (Date.now() - lastSignInTime > INACTIVITY_TIMEOUT) {
                    console.log('Session expired: No local activity record and last login > 10 mins ago');
                    signOut();
                    return;
                }
            }
            localStorage.setItem(STORAGE_KEY, Date.now().toString());
        }
        const resetTimer = () => {
            if (timeoutId) clearTimeout(timeoutId);
            timeoutId = setTimeout(async () => {
                console.log('Session timed out due to inactivity');
                await signOut();
            }, INACTIVITY_TIMEOUT);
        };
        const handleActivity = () => {
            localStorage.setItem(STORAGE_KEY, Date.now().toString());
            resetTimer();
        };
        const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
        events.forEach(event => {
            window.addEventListener(event, handleActivity);
        });
        handleActivity();
        return () => {
            if (timeoutId) clearTimeout(timeoutId);
            events.forEach(event => {
                window.removeEventListener(event, handleActivity);
            });
        };
    }, [user, firebaseUser]);

    const signIn = async (email: string, password: string) => {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const docSnap = await getDoc(doc(db, 'users', userCredential.user.uid));
        if (!docSnap.exists()) {
            await firebaseSignOut(auth);
            throw new Error('user-not-found-in-db');
        }
        const userData = docSnap.data();
        if (userData?.status === 'pending') {
            await firebaseSignOut(auth);
            throw new Error('user-pending');
        }
        if (userData?.status === 'blocked') {
            await firebaseSignOut(auth);
            throw new Error('user-blocked');
        }
        if (userData?.status === 'rejected') {
            await firebaseSignOut(auth);
            throw new Error('user-rejected');
        }
        if (userData?.status === 'inactive') {
            await firebaseSignOut(auth);
            throw new Error('user-inactive');
        }
    };

    const signUp = async (email: string, password: string, name: string, firstSurname: string, secondSurname: string, role: UserRole) => {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await createUserDoc(userCredential.user.uid, name, firstSurname, secondSurname, email, role);
        } catch (error: any) {
            console.log("Signup error:", error.code);
            if (error.code === 'auth/email-already-in-use') {
                try {
                    const userCredential = await signInWithEmailAndPassword(auth, email, password);
                    const docSnap = await getDoc(doc(db, 'users', userCredential.user.uid));

                    if (!docSnap.exists()) {
                        console.log("Recovering deleted account...");
                        await createUserDoc(userCredential.user.uid, name, firstSurname, secondSurname, email, role);
                    } else if (docSnap.data()?.status === 'rejected') {
                        console.log("Reactivating rejected account...");
                        await setDoc(doc(db, 'users', userCredential.user.uid), {
                            name,
                            firstSurname,
                            secondSurname: secondSurname || '',
                            status: 'pending',
                            updatedAt: new Date()
                        }, { merge: true });
                    } else {
                        throw error;
                    }
                } catch (signInError: any) {
                    console.error("Recovery sign-in failed:", signInError);
                    throw error;
                }
            } else {
                throw error;
            }
        }
    };

    const createUserDoc = async (uid: string, name: string, firstSurname: string, secondSurname: string, email: string, role: UserRole) => {
        await setDoc(doc(db, 'users', uid), {
            name,
            firstSurname,
            secondSurname: secondSurname || '',
            email,
            role,
            points: 0,
            badges: [],
            createdAt: new Date(),
            status: 'pending',
        });
    };

    const resetPassword = async (email: string) => {
        const actionCodeSettings = {
            // This URL must be authorized in Firebase Console -> Auth -> Settings -> Authorized Domains
            url: `${window.location.origin}/auth/reset-password`,
            handleCodeInApp: true,
        };
        await sendPasswordResetEmail(auth, email, actionCodeSettings);
    };

    const confirmNewPassword = async (code: string, password: string) => {
        await confirmPasswordReset(auth, code, password);
    };

    const verifyPasswordCode = async (code: string) => {
        return await verifyPasswordResetCode(auth, code);
    };

    const signOut = async () => {
        localStorage.removeItem('auth_last_activity');
        await firebaseSignOut(auth);
    };

    return (
        <AuthContext.Provider value={{
            user,
            firebaseUser,
            loading,
            signIn,
            signUp,
            signOut,
            resetPassword,
            confirmNewPassword,
            verifyPasswordCode
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
