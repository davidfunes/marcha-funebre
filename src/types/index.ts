export type UserRole = 'admin' | 'conductor' | 'manager';

export interface User {
    id?: string;
    email: string;
    name: string;
    firstSurname: string;
    secondSurname?: string;
    role: UserRole;
    points: number;
    badges: string[];
    createdAt: any;
    avatar?: string;
    assignedVehicleId?: string;
    licenseNumber?: string;
    status: 'active' | 'inactive' | 'pending' | 'rejected' | 'blocked';
}

export type VehicleStatus = 'active' | 'maintenance' | 'rented' | 'retired';

export interface VehicleBrand {
    id?: string;
    name: string;
    createdAt?: any;
    updatedAt?: any;
}

export interface Vehicle {
    id?: string;
    brandId: string;
    brand?: string; // Backward compatibility - will be populated from brandId
    model: string;
    plate: string;
    status: VehicleStatus;
    odometer: number;
    year: number;
    fuelType: 'gasoline' | 'diesel' | 'electric' | 'hybrid';
    transmission: 'manual' | 'automatic';
    image?: string;
    nextMaintenanceDate?: any; // Firestore Timestamp
    insuranceExpiry?: any;
    rentingCompanyId?: string; // If rented
    contractStartDate?: any;
    contractEndDate?: any;
    workshopId?: string; // Assigned workshop
    assignedDriverId?: string;
    isManagement?: boolean; // If true, only admins/managers can assign
    requiresParkingSpot?: boolean; // If true, requires location on return
    parkingLocation?: string; // Current parking spot
    warehouseId?: string; // Assigned Headquarters (Sede/Tanatorio)
    fuelLevel?: string; // Current fuel level percentage (0-100)
}

export interface VehicleMake {
    id?: string;
    name: string;
    models: string[];
}

export type IncidentPriority = 'low' | 'medium' | 'high' | 'critical';
export type IncidentStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type MaterialCondition =
    | 'pending_management'
    | 'new_functional'
    | 'working_urgent_change'
    | 'totally_broken'
    | 'ordered'
    | 'resolved'
    | 'new' // Legacy
    | 'broken'; // Legacy

export const MATERIAL_STATUS_LABELS: Record<string, string> = {
    pending_management: 'Pendiente de gestionar',
    new_functional: 'Nuevo o funcional',
    working_urgent_change: 'Funciona pero urge un cambio',
    totally_broken: 'Completamente roto',
    ordered: 'Pedido',
    resolved: 'Resuelto',
    new: 'Nuevo o funcional',
    broken: 'Completamente roto'
};

export const VEHICLE_STATUS_LABELS: Record<string, string> = {
    active: 'Activo',
    maintenance: 'En Mantenimiento',
    rented: 'Alquilado',
    retired: 'Retirado'
};

export const FUEL_TYPE_LABELS: Record<string, string> = {
    gasoline: 'Gasolina',
    diesel: 'Diésel',
    electric: 'Eléctrico',
    hybrid: 'Híbrido'
};

export const TRANSMISSION_LABELS: Record<string, string> = {
    manual: 'Manual',
    automatic: 'Automático'
};

export const INCIDENT_PRIORITY_LABELS: Record<string, string> = {
    low: 'Baja',
    medium: 'Media',
    high: 'Alta',
    critical: 'Crítica'
};

export const INCIDENT_STATUS_LABELS: Record<string, string> = {
    open: 'Abierta',
    in_progress: 'En Progreso',
    resolved: 'Resuelta',
    closed: 'Cerrada'
};

export const INVENTORY_CATEGORY_LABELS: Record<string, string> = {
    sound: 'Sonido',
    lighting: 'Iluminación',
    instruments: 'Instrumentos',
    cables: 'Cableado',
    misc: 'Varios'
};

export const MAINTENANCE_TYPE_LABELS: Record<string, string> = {
    preventive: 'Preventivo',
    corrective: 'Correctivo',
    inspection: 'Inspección',
    tire_change: 'Cambio de Neumáticos'
};

export const MAINTENANCE_STATUS_LABELS: Record<string, string> = {
    scheduled: 'Programado',
    completed: 'Completado',
    in_progress: 'En Curso'
};

export const REPORT_TYPE_LABELS: Record<string, string> = {
    financial: 'Financiero',
    operational: 'Operativo',
    inventory: 'Inventario',
    personnel: 'Personal'
};

export const INVENTORY_STATUS_LABELS: Record<string, string> = {
    available: 'Disponible',
    assigned: 'Asignado',
    repair: 'En Reparación',
    lost: 'Perdido'
};

export const USER_STATUS_LABELS: Record<string, string> = {
    active: 'Activo',
    inactive: 'Inactivo',
    pending: 'Pendiente',
    rejected: 'Rechazado',
    blocked: 'Bloqueado'
};

export const USER_ROLE_LABELS: Record<string, string> = {
    admin: 'Administrador',
    conductor: 'Conductor',
    manager: 'Gestor'
};

export interface Incident {
    id?: string;
    title: string;
    description: string;
    priority: IncidentPriority;
    status: IncidentStatus;
    vehicleId: string;
    reportedByUserId: string;
    inventoryItemId?: string; // Optional: linked to a specific item
    sourceVehicleId?: string; // Optional: where the item was when it broke
    createdAt: any;
    updatedAt?: any;
    images?: string[];
    cost?: number;
}

export interface InventoryItem {
    id?: string;
    name: string;
    sku: string;
    category: 'sound' | 'lighting' | 'instruments' | 'cables' | 'misc';
    brand?: string;
    model?: string;
    status: 'available' | 'assigned' | 'repair' | 'lost';

    // Multi-location support
    locations?: {
        type: 'warehouse' | 'vehicle';
        id: string; // warehouseId or vehicleId
        quantity: number;
        status?: MaterialCondition; // Default 'new' or 'ok' (legacy)
    }[];

    // Single location (Legacy - keep for backward compatibility or easy access)
    warehouseId?: string;
    vehicleId?: string;
    assignedToUserId?: string; // If assigned to a musician/driver
    purchaseDate?: any;
    price?: number;
    quantity: number;
    notes?: string;
}

export interface Warehouse {
    id?: string;
    name: string;
    location: string;
    capacity: number; // Max items
    currentStock: number;
    managerId?: string;
}

export interface Workshop {
    id?: string;
    name: string;
    brandId: string;
    brand?: string; // Backward compatibility - will be populated from brandId
    address: string;
    phone: string;
    createdAt?: any;
    updatedAt?: any;
}

export interface RentingCompany {
    id?: string;
    name: string;
    contactPerson: string;
    email: string;
    phone: string;
    address: string;
    activeContracts: number;
    website?: string;
}

export interface MaintenanceRecord {
    id?: string;
    vehicleId: string;
    date: any;
    type: 'preventive' | 'corrective' | 'inspection' | 'tire_change';
    cost: number;
    garageName: string; // Keep for backward compatibility or custom text
    workshopId?: string; // Link to official Workshop
    description: string;
    odometerAtService: number;
    nextServiceOdometer?: number;
    invoiceUrl?: string;
    status: 'scheduled' | 'completed' | 'in_progress';
}

export interface Report {
    id?: string;
    title: string;
    type: 'financial' | 'operational' | 'inventory' | 'personnel';
    generatedAt: any;
    generatedByUserId: string;
    url?: string;
    summary: string;
}

export interface DriverLog {
    id?: string;
    userId: string;
    vehicleId: string;
    date: any;
    type: 'km' | 'fuel';
    value: number; // KM read or Liters
    cost?: number; // For fuel
    imageUrl?: string;
    createdAt: any;
}

export interface Checklist {
    id?: string;
    userId: string;
    vehicleId: string;
    date: any;
    items: {
        id: string;
        label: string;
        status: 'ok' | 'issue';
        notes?: string;
    }[];
    status: 'passed' | 'failed';
    createdAt: any;
}
