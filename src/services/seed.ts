import { db } from '@/lib/firebase/firebase';
import { collection, doc, writeBatch, Timestamp, setDoc } from 'firebase/firestore';
import { User, Vehicle, Incident, InventoryItem, RentingCompany, Warehouse, MaintenanceRecord } from '@/types';

// Helper to generate random date
const randomDate = (start: Date, end: Date) => {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

export const seedDatabase = async () => {
    console.log('Starting Master Seed...');
    const batch = writeBatch(db);

    // 1. Users (Drivers & Admins)
    const users: User[] = [
        {
            id: 'admin_1',
            name: 'David',
            firstSurname: 'Funes',
            email: 'admin@fleet.com',
            role: 'admin',
            points: 1000,
            badges: ['master_admin'],
            status: 'active',
            createdAt: Timestamp.now(),
        },
        {
            id: 'driver_1',
            name: 'Carlos',
            firstSurname: 'Sainz',
            email: 'carlos@fleet.com',
            role: 'conductor',
            points: 450,
            badges: ['safe_driver'],
            status: 'active',
            createdAt: Timestamp.now(),
        },
        {
            id: 'driver_2',
            name: 'Fernando',
            firstSurname: 'Alonso',
            email: 'fernando@fleet.com',
            role: 'conductor',
            points: 800,
            badges: ['veteran', 'speed_king'],
            status: 'active',
            createdAt: Timestamp.now(),
        }
    ];

    users.forEach(u => {
        const ref = doc(db, 'users', u.id!);
        const { id, ...data } = u;
        batch.set(ref, data);
    });

    // 2. Warehouses
    const warehouses: Warehouse[] = [
        { name: 'Nave central Madrid', location: 'Polígono Industrial Vallecas', capacity: 1000, currentStock: 0 },
        { name: 'Almacén Barcelona', location: 'Zona Franca', capacity: 500, currentStock: 0 },
        { name: 'Garaje Norte', location: 'San Sebastián de los Reyes', capacity: 200, currentStock: 0 }
    ];

    const warehouseIds: string[] = [];
    warehouses.forEach(w => {
        const ref = doc(collection(db, 'warehouses'));
        warehouseIds.push(ref.id);
        batch.set(ref, w);
    });

    // 3. Renting Companies
    const companies: RentingCompany[] = [
        { name: 'LeasePlan', contactPerson: 'Maria Garcia', email: 'maria@leaseplan.com', phone: '+34 912 345 678', address: 'Av. Manoteras 2', activeContracts: 15 },
        { name: 'Arval', contactPerson: 'Juan Lopez', email: 'juan@arval.com', phone: '+34 934 567 890', address: 'Paseo de la Castellana 100', activeContracts: 8 }
    ];

    companies.forEach(c => {
        const ref = doc(collection(db, 'renting_companies'));
        batch.set(ref, c);
    });

    // 4. Vehicles
    const vehicles: Vehicle[] = [
        { brand: 'Toyota', model: 'Corolla Hybrid', plate: '1234 LBB', status: 'active', odometer: 15400, year: 2023, fuelType: 'hybrid', transmission: 'automatic', image: 'https://images.unsplash.com/photo-1623869675785-654b8c1c3855?auto=format&fit=crop&q=80&w=400', brandId: 'brand_toyota' },
        { brand: 'Ford', model: 'Transit Custom', plate: '5678 KMR', status: 'active', odometer: 45000, year: 2022, fuelType: 'diesel', transmission: 'manual', image: 'https://images.unsplash.com/photo-1599908169199-0d500445d44c?auto=format&fit=crop&q=80&w=400', brandId: 'brand_ford' },
        { brand: 'Peugeot', model: 'Partner', plate: '9012 JKL', status: 'maintenance', odometer: 67000, year: 2021, fuelType: 'diesel', transmission: 'manual', image: 'https://images.unsplash.com/photo-1630628373738-4225a072d627?auto=format&fit=crop&q=80&w=400', brandId: 'brand_peugeot' },
        { brand: 'Tesla', model: 'Model 3', plate: '3456 MMC', status: 'rented', odometer: 12000, year: 2023, fuelType: 'electric', transmission: 'automatic', image: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&q=80&w=400', brandId: 'brand_tesla' },
        { brand: 'Mercedes', model: 'Vito', plate: '7890 HGT', status: 'active', odometer: 125000, year: 2019, fuelType: 'diesel', transmission: 'manual', image: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&q=80&w=400', brandId: 'brand_mercedes' }
    ];

    const vehicleIds: string[] = [];
    vehicles.forEach(v => {
        const ref = doc(collection(db, 'vehicles'));
        vehicleIds.push(ref.id);
        batch.set(ref, { ...v, nextMaintenanceDate: Timestamp.fromDate(randomDate(new Date(), new Date(2025, 12, 31))) });
    });

    // 5. Inventory
    const inventory: InventoryItem[] = [
        { name: 'Shure SM58', sku: 'MIC-001', category: 'sound', status: 'available', quantity: 12, warehouseId: warehouseIds[0], brand: 'Shure', model: 'SM58' },
        { name: 'Shure SM57', sku: 'MIC-002', category: 'sound', status: 'available', quantity: 8, warehouseId: warehouseIds[0], brand: 'Shure', model: 'SM57' },
        { name: 'Yamaha MG10XU', sku: 'MIX-001', category: 'sound', status: 'assigned', quantity: 2, warehouseId: warehouseIds[1], brand: 'Yamaha', model: 'MG10XU' },
        { name: 'Gibson Les Paul', sku: 'INS-001', category: 'instruments', status: 'available', quantity: 1, warehouseId: warehouseIds[0], brand: 'Gibson', model: 'Standard' },
        { name: 'Fender Stratocaster', sku: 'INS-002', category: 'instruments', status: 'repair', quantity: 1, warehouseId: warehouseIds[2], brand: 'Fender', model: 'Player' },
        { name: 'Korg Kronos', sku: 'INS-003', category: 'instruments', status: 'available', quantity: 1, warehouseId: warehouseIds[0], brand: 'Korg', model: 'Kronos 2' },
        { name: 'Roland RD-2000', sku: 'INS-004', category: 'instruments', status: 'assigned', quantity: 1, warehouseId: warehouseIds[1], brand: 'Roland', model: 'RD-2000' },
        { name: 'Cable XLR 10m', sku: 'CBL-001', category: 'cables', status: 'available', quantity: 50, warehouseId: warehouseIds[0], brand: 'Generic', model: 'Pro' },
        { name: 'Cable Jack-Jack 5m', sku: 'CBL-002', category: 'cables', status: 'available', quantity: 30, warehouseId: warehouseIds[0], brand: 'Generic', model: 'Standard' },
        { name: 'Foco LED Par 64', sku: 'LGT-005', category: 'lighting', status: 'assigned', quantity: 4, warehouseId: warehouseIds[1], brand: 'Stairville', model: 'LED Par 64' }
    ];

    inventory.forEach(i => {
        const ref = doc(collection(db, 'inventory'));
        batch.set(ref, i);
    });

    // 6. Incidents
    const mockIncidents: Incident[] = [
        { title: 'Fallo Motor', description: 'Ruido extraño al arrancar en frío.', priority: 'high', status: 'open', vehicleId: vehicleIds[2], reportedByUserId: 'driver_1', createdAt: Timestamp.now() },
        { title: 'Pinchazo', description: 'Rueda trasera derecha.', priority: 'medium', status: 'resolved', vehicleId: vehicleIds[1], reportedByUserId: 'driver_2', createdAt: Timestamp.fromDate(new Date('2024-01-15')) }
    ];

    mockIncidents.forEach(inc => {
        const ref = doc(collection(db, 'incidents'));
        batch.set(ref, inc);
    });

    await batch.commit();
    console.log('Database seeded successfully with PREMIUM data.');
};

export const repairAdminProfile = async (uid: string) => {
    console.log(`Reparing profile for ${uid}...`);
    const ref = doc(db, 'users', uid);
    await setDoc(ref, {
        id: uid,
        name: 'Admin',
        firstSurname: 'Recuperado',
        email: 'admin@repaired.com',
        role: 'admin',
        points: 1000,
        badges: ['master_admin'],
        status: 'active',
        createdAt: Timestamp.now(),
    });
    console.log('Profile repaired!');
};
