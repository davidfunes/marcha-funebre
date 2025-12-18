import { initializeApp, getApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { firebaseConfig } from '@/lib/firebase/config';
import {
    collection,
    getDocs,
    doc,
    setDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    Timestamp,
    arrayUnion
} from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import {
    Vehicle,
    Incident,
    User,
    InventoryItem,
    MaintenanceRecord,
    Warehouse,
    RentingCompany
} from '@/types';

/**
 * Creates a new user in Firebase Auth without logging out the current admin.
 * Uses a secondary temporary Firebase App instance.
 */
export const registerUser = async (email: string, password: string): Promise<string> => {
    let secondaryApp;
    try {
        // Create a unique name for the secondary app to avoid conflicts
        const appName = `secondaryApp-${Date.now()}`;
        secondaryApp = initializeApp(firebaseConfig, appName);
        const secondaryAuth = getAuth(secondaryApp);

        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
        const uid = userCredential.user.uid;

        // Sign out from the secondary app specifically to be safe, 
        // though deleting the app should handle cleanup.
        await signOut(secondaryAuth);

        return uid;
    } catch (error) {
        console.error("Error creating user:", error);
        throw error;
    } finally {
        if (secondaryApp) {
            await deleteApp(secondaryApp);
        }
    }
};

/**
 * Smart Vehicle Taxonomy Logic
 * Checks if a make exists. If so, adds the model to it.
 * If not, creates the make with the model.
 */
export const addVehicleTaxonomy = async (brand: string, model: string): Promise<void> => {
    try {
        if (!brand || !model) return;

        const normalizedBrand = brand.trim();
        const normalizedModel = model.trim();

        // Use normalized brand as ID to prevent duplicates (e.g. "Toyota" vs "toyota")
        // We'll store the ID as lowercase for consistency, but the name field as entered
        const brandId = normalizedBrand.toLowerCase();

        const docRef = doc(db, 'vehicle_makes', brandId);

        // We use setDoc with merge: true. 
        // If doc exists, it updates. If not, it creates.
        await setDoc(docRef, {
            name: normalizedBrand, // Keep original casing for display
            models: arrayUnion(normalizedModel),
            updatedAt: Timestamp.now()
        }, { merge: true });

    } catch (error) {
        console.error("Error updating vehicle taxonomy:", error);
        // We don't throw here strictly, as this is a background enhancement
        // and shouldn't block the main vehicle creation if it fails.
    }
};

// Generic Collection Helper

// Generic Collection Helper
export const getCollection = async <T>(collectionName: string): Promise<T[]> => {
    const querySnapshot = await getDocs(collection(db, collectionName));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
};

// Generic Add
export const addItem = async <T extends object>(collectionName: string, data: T): Promise<string> => {
    // Check if ID is provided in data (e.g. for Users where we use Auth UID)
    if ('id' in data && data.id) {
        const { id, ...rest } = data as any;
        await setDoc(doc(db, collectionName, id), rest);
        return id;
    } else {
        const docRef = await addDoc(collection(db, collectionName), data);
        return docRef.id;
    }
};

// Generic Update
export const updateItem = async <T>(collectionName: string, id: string, data: Partial<T>): Promise<void> => {
    const docRef = doc(db, collectionName, id);
    await updateDoc(docRef, data as any);
};

// Generic Delete
export const deleteItem = async (collectionName: string, id: string): Promise<void> => {
    await deleteDoc(doc(db, collectionName, id));
};

// Specific Listeners (Real-time)
export const subscribeToCollection = <T>(collectionName: string, callback: (data: T[]) => void) => {
    const q = query(collection(db, collectionName));
    return onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
        callback(data);
    }, (error) => {
        if (error.code === 'permission-denied') {
            console.log(`Permission denied for collection ${collectionName} (likely due to logout). Ignoring.`);
        } else {
            console.error(`Error subscribing to ${collectionName}:`, error);
        }
    });
};

// --- Specific Services (Backwards compatibility + Helper Logic) ---

export const getVehicles = () => getCollection<Vehicle>('vehicles');
export const getIncidents = () => getCollection<Incident>('incidents');
export const getUsers = () => getCollection<User>('users');
export const getInventory = () => getCollection<InventoryItem>('inventory');
export const getMaintenance = () => getCollection<MaintenanceRecord>('maintenance');
export const getWarehouses = () => getCollection<Warehouse>('warehouses');
export const getRentingCompanies = () => getCollection<RentingCompany>('renting_companies');

// Firebase Storage Helpers
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase/firebase';

export const uploadFile = async (file: File, path: string): Promise<string> => {
    try {
        const storageRef = ref(storage, path);
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        return downloadURL;
    } catch (error) {
        console.error("Error uploading file:", error);
        throw error;
    }
};

export const getAdminMessages = async (): Promise<any[]> => {
    try {
        const q = query(collection(db, 'admin_messages'), orderBy('timestamp', 'desc'));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error getting admin messages:", error);
        return [];
    }
};
