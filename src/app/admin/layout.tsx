'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
    LayoutDashboard,
    Car,
    Music,
    AlertTriangle,
    Users,
    FileText,
    Wrench,
    LogOut,
    Warehouse,
    Building2,
    Menu,
    X,
    Tag,
    Play,
    Trophy
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Logo } from '@/components/ui/Logo';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { DataIntegrityChecker } from '@/components/admin/DataIntegrityChecker';
import { isProfileComplete } from '@/utils/profileUtils';
import { ProfileCompletionAlert } from '@/components/profile/ProfileCompletionAlert';

function SidebarLink({ item, onClick }: { item: any; onClick?: () => void }) {
    const pathname = usePathname();
    const isActive = pathname === item.href;

    return (
        <Link
            href={item.href}
            onClick={onClick}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${isActive
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
        >
            <item.icon className="h-4 w-4" />
            {item.label}
        </Link>
    );
}

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, loading, signOut } = useAuth();
    const router = useRouter();
    const [authorized, setAuthorized] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.push('/login');
            } else if (user.role !== 'admin') {
                router.push('/login');
            } else {
                setAuthorized(true);
            }
        }
    }, [user, loading, router]);

    if (loading || !authorized) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                    <p className="text-sm text-muted-foreground animate-pulse">Verificando permisos de administrador...</p>
                </div>
            </div>
        );
    }

    const menuItems = [
        { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
        { label: 'Vehículos', href: '/admin/vehicles', icon: Car },
        { label: 'Empresas Renting', href: '/admin/renting', icon: Building2 },
        { label: 'Inventario', href: '/admin/inventory', icon: Music },
        { label: 'Almacenes', href: '/admin/warehouses', icon: Warehouse },
        { label: 'Talleres', href: '/admin/workshops', icon: Wrench },
        { label: 'Marcas', href: '/admin/brands', icon: Tag },
        { label: 'Incidencias', href: '/admin/incidents', icon: AlertTriangle },
        { label: 'Conductores', href: '/admin/users', icon: Users },
        { label: 'Ranking', href: '/admin/ranking', icon: Trophy },
        { label: 'Mantenimiento', href: '/admin/maintenance', icon: Wrench },
    ];

    const SidebarContent = ({ isMobile = false }) => (
        <div className="flex flex-col h-full bg-card border-r border-border">
            <div className="flex h-16 items-center px-6 border-b border-border justify-between">
                <Logo size="md" />
                {isMobile && (
                    <button onClick={() => setMobileMenuOpen(false)} className="md:hidden p-1 text-muted-foreground">
                        <X className="h-5 w-5" />
                    </button>
                )}
            </div>

            <nav className="flex-1 overflow-y-auto p-4 space-y-1">
                {menuItems.map((item) => (
                    <SidebarLink
                        key={item.href}
                        item={item}
                        onClick={() => isMobile && setMobileMenuOpen(false)}
                    />
                ))}
            </nav>

            <div className="p-4 border-t border-border">
                <button
                    onClick={() => signOut()}
                    className="flex w-full items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                >
                    <LogOut className="h-4 w-4" />
                    Cerrar Sesión
                </button>
            </div>
        </div>
    );

    return (
        <div className="flex h-screen bg-background text-foreground overflow-hidden">
            {/* Desktop Sidebar */}
            <aside className="hidden md:flex w-64 flex-shrink-0 flex-col">
                <SidebarContent />
            </aside>

            {/* Mobile Sidebar Overlay */}
            {mobileMenuOpen && (
                <div className="fixed inset-0 z-50 md:hidden flex">
                    <div
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => setMobileMenuOpen(false)}
                    />
                    <div className="relative w-72 max-w-[80%] flex flex-col items-stretch animate-in slide-in-from-left duration-200">
                        <SidebarContent isMobile />
                    </div>
                </div>
            )}

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col overflow-hidden w-full">
                {/* Global Integrity Check */}
                <DataIntegrityChecker />

                {user && !isProfileComplete(user) && (
                    <div className="px-4 md:px-0">
                        <ProfileCompletionAlert role="admin" />
                    </div>
                )}

                {/* Header */}
                <header className="flex h-16 items-center justify-between border-b border-border px-4 md:px-8 bg-card/50 backdrop-blur shrink-0 transition-opacity">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setMobileMenuOpen(true)}
                            className="md:hidden p-2 -ml-2 text-muted-foreground hover:text-foreground"
                        >
                            <Menu className="h-6 w-6" />
                        </button>
                        <Logo size="sm" className="md:hidden" />
                        <div className="hidden md:block text-sm font-medium text-muted-foreground">Admin Portal</div>
                        <div className="h-6 w-px bg-border hidden md:block"></div>
                        <Link
                            href="/driver/dashboard"
                            className="flex items-center justify-center w-8 h-8 text-primary bg-primary/10 border border-primary/20 rounded-full hover:bg-primary/20 transition-all shadow-sm group relative"
                            title="Ver como Conductor"
                        >
                            <Play className="h-3.5 w-3.5 fill-current" />
                            <span className="sr-only">Ver como Conductor</span>
                        </Link>
                    </div>

                    <div className="flex items-center gap-4">
                        <ThemeToggle />

                        <div className="hidden md:block h-6 w-px bg-border"></div>

                        <Link href="/admin/profile" className="flex items-center gap-3 hover:bg-muted/50 p-1.5 rounded-lg transition-colors">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-medium leading-none">{user?.name}</p>
                                <p className="text-xs text-muted-foreground mt-1 capitalize">{user?.role}</p>
                            </div>
                            <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center shrink-0 overflow-hidden">
                                {user?.avatar ? (
                                    <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="font-bold text-secondary-foreground">{user?.name?.charAt(0)}</span>
                                )}
                            </div>
                        </Link>

                        <button
                            onClick={() => signOut()}
                            className="p-2 text-destructive hover:bg-destructive/10 rounded-full transition-colors"
                            title="Cerrar Sesión"
                        >
                            <LogOut className="h-5 w-5" />
                        </button>
                    </div>
                </header>

                {/* Page Content */}
                <div className="flex-1 overflow-y-auto bg-background p-4 md:p-0">
                    {children}
                </div>
            </main>
        </div>
    );
}
