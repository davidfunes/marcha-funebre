'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
    User as FirebaseUser,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut as firebaseSignOut,
    createUserWithEmailAndPassword,
} from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, collection, getDocs } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/firebase';
import { User, UserRole } from '@/types';

interface AuthContextType {
    user: User | null;
    firebaseUser: FirebaseUser | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string, name: string, role: UserRole) => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let userUnsubscribe: (() => void) | null = null;

        const authUnsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            setFirebaseUser(firebaseUser);

            // Cleanup previous user listener if any (e.g. switching accounts)
            if (userUnsubscribe) {
                userUnsubscribe();
                userUnsubscribe = null;
            }

            if (firebaseUser) {
                // Subscribe to user data in real-time
                console.log('Subscribing to user profile for:', firebaseUser.uid);
                console.log('DEBUG: Connected to Project ID:', auth.app.options.projectId);


                // DEBUG: Verify collection contents
                getDocs(collection(db, 'users')).then(snapshot => {
                    console.log(`DEBUG: Collection 'users' contains ${snapshot.size} documents.`);
                    snapshot.forEach(doc => {
                        console.log(`DEBUG: Found doc ID: '${doc.id}'`);
                    });
                }).catch(err => console.error('DEBUG: Error querying users collection:', err));


                try {
                    userUnsubscribe = onSnapshot(doc(db, 'users', firebaseUser.uid),
                        (docSnapshot) => {
                            if (docSnapshot.exists()) {
                                console.log('User profile updated');
                                setUser({ id: firebaseUser.uid, ...docSnapshot.data() } as User);
                            } else {
                                console.error('User document does not exist for UID:', firebaseUser.uid);
                                setUser(null);
                            }
                            setLoading(false);
                        },
                        (error) => {
                            console.error('Error listening to user profile:', error);
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

    // Session Inactivity Timeout
    useEffect(() => {
        // Only track if user is fully logged in
        if (!user || !firebaseUser) return;

        const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutes
        const STORAGE_KEY = 'auth_last_activity';
        let timeoutId: NodeJS.Timeout;

        // Check for existing session validity on mount
        const lastActiveStr = localStorage.getItem(STORAGE_KEY);

        if (lastActiveStr) {
            // Case 1: We have a local record
            const lastActive = parseInt(lastActiveStr, 10);
            if (Date.now() - lastActive > INACTIVITY_TIMEOUT) {
                console.log('Session expired based on persistent storage');
                signOut();
                return;
            }
        } else {
            // Case 2: Zero Trust - No local record (cleared or new device)
            // If the actual Firebase login was > 10 mins ago, force logout.
            // This prevents bypassing the timer by clearing localStorage.
            const lastSignIn = firebaseUser.metadata.lastSignInTime;
            if (lastSignIn) {
                const lastSignInTime = new Date(lastSignIn).getTime();
                if (Date.now() - lastSignInTime > INACTIVITY_TIMEOUT) {
                    console.log('Session expired: No local activity record and last login > 10 mins ago');
                    signOut();
                    return;
                }
            }
            // If we're here, it's either a fresh login or within the window.
            // Initialize storage to now.
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

        // Events to track
        const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];

        // Add listeners
        events.forEach(event => {
            window.addEventListener(event, handleActivity);
        });

        // Initialize timer and storage
        handleActivity();

        // Cleanup
        return () => {
            if (timeoutId) clearTimeout(timeoutId);
            events.forEach(event => {
                window.removeEventListener(event, handleActivity);
            });
        };
    }, [user, firebaseUser]); // Re-run when user changes (login/logout)

    const signIn = async (email: string, password: string) => {
        await signInWithEmailAndPassword(auth, email, password);
    };

    const signUp = async (email: string, password: string, name: string, role: UserRole) => {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);

        // Create user document in Firestore
        await setDoc(doc(db, 'users', userCredential.user.uid), {
            name,
            email,
            role,
            points: 0,
            badges: [],
            createdAt: new Date(),
        });
    };

    const signOut = async () => {
        localStorage.removeItem('auth_last_activity');
        await firebaseSignOut(auth);
    };

    return (
        <AuthContext.Provider value={{ user, firebaseUser, loading, signIn, signUp, signOut }}>
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
