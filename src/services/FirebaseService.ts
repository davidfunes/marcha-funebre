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
    arrayUnion,
    runTransaction,
    getDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import {
    Vehicle,
    Incident,
    User,
    InventoryItem,
    MaintenanceRecord,
    Warehouse,
    RentingCompany,
    MaterialCondition
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
    if (!file) throw new Error("No se ha proporcionado ningún archivo");
    if (!path) throw new Error("No se ha proporcionado una ruta de destino");

    try {
        console.log(`Starting upload of ${file.name} to ${path}`);
        const storageRef = ref(storage, path);
        const metadata = {
            contentType: file.type,
        };
        const snapshot = await uploadBytes(storageRef, file, metadata);
        const downloadURL = await getDownloadURL(snapshot.ref);
        console.log("Upload successful. Download URL:", downloadURL);
        return downloadURL;
    } catch (error: any) {
        console.error("Error uploading file to Firebase Storage:", error);
        if (error.code === 'storage/unauthorized') {
            throw new Error("No tienes permiso para subir archivos. Verifica las reglas de Storage.");
        } else if (error.code === 'storage/canceled') {
            throw new Error("La subida fue cancelada.");
        }
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

/**
 * Reports an incident for a material item.
 * Unlinks from vehicle only if 'totally_broken'.
 */
export const reportMaterialIncident = async (
    incidentData: Partial<Incident>,
    itemId: string,
    locationId: string, // Changed from vehicleId to be more generic
    condition: MaterialCondition
): Promise<string> => {
    return await runTransaction(db, async (transaction) => {
        const itemRef = doc(db, 'inventory', itemId);
        const itemDoc = await transaction.get(itemRef);

        if (!itemDoc.exists()) throw new Error("Item not found");

        const item = itemDoc.data() as InventoryItem;
        const locations = [...(item.locations || [])];

        // 1. Find the item in the specified location
        // We prioritize stacks that are "good" (new, functional, ok, or undefined)
        let locIdx = locations.findIndex(l =>
            l.id === locationId &&
            (!l.status || l.status === 'new' || l.status === 'working_urgent_change' || (l.status as any) === 'ok')
        );

        // Fallback: If no "good" stack found, just find ANY stack in that location (except ordered)
        if (locIdx === -1) {
            locIdx = locations.findIndex(l => l.id === locationId && l.status !== 'ordered');
        }

        if (locIdx === -1) throw new Error("Item not found in specified location");

        // 2. Update status in place. If quantity > 1, split it.
        if (locations[locIdx].quantity > 1) {
            // Decrement one from the healthy stack
            locations[locIdx].quantity -= 1;
            // Add one with the incident status
            locations.push({
                type: locations[locIdx].type,
                id: locations[locIdx].id,
                quantity: 1,
                status: condition
            });
        } else {
            // Just update the status if only 1 unit exists
            locations[locIdx].status = condition;
        }

        // Update item in Firestore
        transaction.update(itemRef, { locations });

        // 3. Create Incident linked to this item and location
        const incidentRef = doc(collection(db, 'incidents'));
        const fullIncident = {
            ...incidentData,
            inventoryItemId: itemId,
            vehicleId: locations[locIdx].type === 'vehicle' ? locationId : '', // For UI backward compatibility
            sourceLocationId: locationId, // New field for clarity
            sourceLocationType: locations[locIdx].type,
            status: 'open',
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        };
        transaction.set(incidentRef, fullIncident);

        return incidentRef.id;
    });
};

/**
 * Restores a material item from the repair pool or flagged status to a warehouse.
 * Always restores to 'new' (Nuevo o funcional).
 */
export const restoreMaterial = async (
    incidentId: string,
    itemId: string,
    targetId: string,
    targetType: 'warehouse' | 'vehicle' = 'warehouse'
): Promise<void> => {
    await runTransaction(db, async (transaction) => {
        const itemRef = doc(db, 'inventory', itemId);
        const itemDoc = await transaction.get(itemRef);
        const incidentRef = doc(db, 'incidents', incidentId);

        if (!itemDoc.exists()) throw new Error("Item not found");

        const item = itemDoc.data() as InventoryItem;
        let locations = [...(item.locations || [])];

        // 1. Identify the unit to restore (any non-new status)
        const brokenIdx = locations.findIndex(l =>
            l.status === 'totally_broken' ||
            l.status === 'working_urgent_change' ||
            l.status === 'ordered' ||
            (l.status as any) === 'broken'
        );

        if (brokenIdx !== -1) {
            // Remove one unit from the broken/urgent/ordered stack
            if (locations[brokenIdx].quantity > 1) {
                locations[brokenIdx].quantity -= 1;
            } else {
                locations.splice(brokenIdx, 1);
            }
        } else {
            // Check if there's any item in a 'broken' type location (REPAIR_POOL legacy)
            const repairIdx = locations.findIndex(l => l.id === 'REPAIR_POOL');
            if (repairIdx !== -1) {
                if (locations[repairIdx].quantity > 1) {
                    locations[repairIdx].quantity -= 1;
                } else {
                    locations.splice(repairIdx, 1);
                }
            } else {
                // Last resort: find any incident-related item if we can't find by status
                // If we still can't find it, we might be restoring a "new" item by mistake, but let's be strict
                console.warn("No specific broken status found, attempting to find any unit to move...");
                if (locations.length > 0) {
                    // Try to find one at least
                    locations[0].quantity -= 1;
                    if (locations[0].quantity <= 0) locations.splice(0, 1);
                } else {
                    throw new Error("No items found in any location to restore");
                }
            }
        }

        // 2. Add to Target Destination as 'new'
        const destIdx = locations.findIndex(l => l.id === targetId && l.type === targetType && l.status === 'new');
        if (destIdx !== -1) {
            locations[destIdx].quantity += 1;
        } else {
            locations.push({
                type: targetType,
                id: targetId,
                quantity: 1,
                status: 'new'
            });
        }

        // Update Item and Resolve Incident
        transaction.update(itemRef, { locations });
        transaction.update(incidentRef, { status: 'resolved', updatedAt: Timestamp.now() });
    });
};
