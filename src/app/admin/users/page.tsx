'use client';

import { useState, useEffect } from 'react';
import {
    Plus,
    Edit,
    Trash2,
    User as UserIcon,
    ShieldCheck,
    Award
} from 'lucide-react';
import { DataTable, Column } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import { addItem, updateItem, deleteItem, subscribeToCollection, registerUser } from '@/services/FirebaseService';
import { User, UserRole } from '@/types';
import { Timestamp } from 'firebase/firestore';

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    // Delete Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);

    // Form State
    const [formData, setFormData] = useState<Partial<User> & { password?: string, confirmPassword?: string }>({
        name: '',
        email: '',
        role: 'conductor',
        status: 'active',
        points: 0,
        badges: [],
        password: '',
        confirmPassword: ''
    });

    useEffect(() => {
        const unsubscribe = subscribeToCollection<User>('users', (data) => {
            setUsers(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleOpenModal = (user?: User) => {
        if (user) {
            setEditingUser(user);
            setFormData({ ...user, password: '' });
        } else {
            setEditingUser(null);
            setFormData({
                name: '',
                email: '',
                role: 'conductor',
                status: 'active',
                points: 0,
                badges: [],
                password: '',
                confirmPassword: ''
            });
        }
        setIsModalOpen(true);
    };

    const confirmDelete = (user: User) => {
        setUserToDelete(user);
        setIsDeleteModalOpen(true);
    };

    const executeDelete = async () => {
        if (userToDelete && userToDelete.id) {
            await deleteItem('users', userToDelete.id);
            setIsDeleteModalOpen(false);
            setUserToDelete(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingUser && editingUser.id) {
                // Update existing user
                const { password, ...dataToSave } = formData;
                await updateItem('users', editingUser.id, dataToSave);
            } else {
                // Create new user
                const email = formData.email?.trim();
                const password = formData.password;
                const confirmPassword = formData.confirmPassword;

                if (!email) {
                    alert('El email es obligatorio');
                    return;
                }
                if (!password || password.length < 6) {
                    alert('La contraseña es obligatoria y debe tener al menos 6 caracteres');
                    return;
                }
                if (password !== confirmPassword) {
                    alert('Las contraseñas no coinciden');
                    return;
                }

                // 1. Create Auth User
                const uid = await registerUser(email, password);

                // 2. Create Firestore Record
                const { password: _, confirmPassword: __, ...restData } = formData;
                const dataToSave = {
                    ...restData,
                    email, // Ensure trimmed email is saved
                    id: uid,
                    createdAt: Timestamp.now()
                };

                await addItem('users', dataToSave);
            }
            setIsModalOpen(false);
        } catch (error: any) {
            console.error('Error saving user:', error);
            if (error.code === 'auth/email-already-in-use') {
                alert('El email ya está registrado.');
            } else {
                alert('Error al guardar el usuario: ' + error.message);
            }
        }
    };

    const columns: Column<User>[] = [
        {
            key: 'name',
            label: 'Nombre',
            sortable: true,
            render: (u) => (
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {u.name.charAt(0)}
                    </div>
                    <div>
                        <p className="font-medium">{u.name}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                </div>
            )
        },
        {
            key: 'role',
            label: 'Rol',
            sortable: true,
            render: (u) => (
                <div className="flex items-center gap-2">
                    {u.role === 'admin' ? <ShieldCheck className="h-4 w-4 text-purple-600" /> : <UserIcon className="h-4 w-4 text-blue-600" />}
                    <span className="capitalize">{u.role}</span>
                </div>
            )
        },
        {
            key: 'points',
            label: 'Puntos',
            sortable: true,
            render: (u) => (
                <div className="flex items-center gap-1 font-medium text-amber-600">
                    <Award className="h-4 w-4" />
                    {u.points}
                </div>
            )
        },
        {
            key: 'status',
            label: 'Estado',
            sortable: true,
            render: (u) => (
                <StatusBadge
                    status={u.status}
                    options={[
                        { label: 'Active', value: 'active' },
                        { label: 'Inactive', value: 'inactive' },
                        { label: 'Pending', value: 'pending' },
                        { label: 'Rejected', value: 'rejected' },
                        { label: 'Blocked', value: 'blocked' }
                    ]}
                    onChange={(newStatus) => {
                        if (u.id) {
                            // Optimistic update logic is handled by listener, but we call updateItem
                            updateItem('users', u.id, { status: newStatus as any });
                        }
                    }}
                />
            )
        },
        {
            key: 'actions',
            label: 'Acciones',
            render: (u) => (
                <div className="flex items-center gap-2">
                    <button
                        onClick={(e) => { e.stopPropagation(); handleOpenModal(u); }}
                        className="p-2 hover:bg-muted rounded-full transition-colors"
                    >
                        <Edit className="h-4 w-4 text-gray-500" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); confirmDelete(u); }}
                        className="p-2 hover:bg-red-50 rounded-full transition-colors"
                    >
                        <Trash2 className="h-4 w-4 text-red-500" />
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className="p-8 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Usuarios</h1>
                    <p className="text-muted-foreground mt-2">Gestiona conductores, administradores y permisos.</p>
                </div>
            </div>

            <DataTable
                columns={columns}
                data={users}
                isLoading={loading}
                title="Lista de Usuarios"
                searchPlaceholder="Buscar por nombre o email..."
                breakpoint="2xl"
                mobileItem={(user) => (
                    <div className="bg-card p-4 rounded-xl border border-border shadow-sm space-y-4">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                                    {user.name.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="font-semibold text-foreground">{user.name}</h3>
                                    <p className="text-xs text-muted-foreground">{user.email}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 bg-muted px-2 py-1 rounded text-xs font-medium border border-border">
                                {user.role === 'admin' ? <ShieldCheck className="h-3 w-3 text-purple-600" /> : <UserIcon className="h-3 w-3 text-blue-600" />}
                                <span className="capitalize">{user.role}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 py-3 border-y border-border/50">
                            <div className="flex flex-col items-center justify-center space-y-1 border-r border-border/50">
                                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Estado</span>
                                <StatusBadge
                                    status={user.status}
                                    options={[
                                        { label: 'Active', value: 'active' },
                                        { label: 'Inactive', value: 'inactive' },
                                        { label: 'Pending', value: 'pending' },
                                        { label: 'Rejected', value: 'rejected' },
                                        { label: 'Blocked', value: 'blocked' }
                                    ]}
                                    onChange={(newStatus) => {
                                        if (user.id) {
                                            updateItem('users', user.id, { status: newStatus as any });
                                        }
                                    }}
                                />
                            </div>
                            <div className="flex flex-col items-center justify-center space-y-1">
                                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Puntos</span>
                                <div className="flex items-center gap-1 font-bold text-amber-600">
                                    <Award className="h-4 w-4" />
                                    {user.points}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
                            <button
                                onClick={(e) => { e.stopPropagation(); handleOpenModal(user); }}
                                className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 text-xs font-medium"
                            >
                                <Edit className="h-3.5 w-3.5" />
                                <span>Editar</span>
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); confirmDelete(user); }}
                                className="p-2 hover:bg-red-50 hover:text-red-600 rounded-lg text-muted-foreground transition-colors flex items-center gap-2 text-xs font-medium dark:hover:bg-red-900/20"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span>Eliminar</span>
                            </button>
                        </div>
                    </div>
                )}
                actionButton={
                    <button
                        onClick={() => handleOpenModal()}
                        className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Nuevo Usuario
                    </button>
                }
            />

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Nombre Completo</label>
                        <input
                            required
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                            placeholder="Juan Pérez"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Email</label>
                        <input
                            type="email"
                            required
                            disabled={!!editingUser} // Prevent changing email for simplicity
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none disabled:opacity-50"
                            placeholder="juan@ejemplo.com"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Rol</label>
                            <select
                                value={formData.role}
                                onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                            >
                                <option value="conductor">Conductor</option>
                                <option value="admin">Administrador</option>
                                <option value="manager">Gestor</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Estado</label>
                            <select
                                value={formData.status}
                                onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                            >
                                <option value="active">Activo</option>
                                <option value="inactive">Inactivo</option>
                                <option value="pending">Pendiente</option>
                                <option value="rejected">Rechazado</option>
                                <option value="blocked">Bloqueado</option>
                            </select>
                        </div>
                    </div>

                    {!editingUser && (
                        <>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Contraseña (Mínimo 6 caracteres)</label>
                                <input
                                    type="password"
                                    required
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                    placeholder="******"
                                    minLength={6}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Confirmar Contraseña</label>
                                <input
                                    type="password"
                                    required
                                    value={formData.confirmPassword}
                                    onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                    placeholder="******"
                                    minLength={6}
                                />
                            </div>
                        </>
                    )}

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Puntos de Gamificación</label>
                        <input
                            type="number"
                            value={formData.points || 0}
                            onChange={e => setFormData({ ...formData, points: parseInt(e.target.value) || 0 })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                        />
                    </div>

                    <div className="pt-4 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="px-4 py-2 rounded-lg bg-muted text-foreground font-medium hover:bg-muted/80 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
                        >
                            {editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Confirmar Eliminación"
            >
                <div>
                    <p className="text-muted-foreground mb-6">
                        ¿Estás seguro de que quieres eliminar al usuario <strong>{userToDelete?.name}</strong>? Esta acción no se puede deshacer.
                    </p>
                    <div className="flex justify-end gap-2">
                        <button
                            onClick={() => setIsDeleteModalOpen(false)}
                            className="px-4 py-2 rounded-lg bg-muted text-foreground font-medium hover:bg-muted/80 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={executeDelete}
                            className="px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition-colors"
                        >
                            Eliminar
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
