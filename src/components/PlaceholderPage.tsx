'use client';
import Link from 'next/link';

export default function PlaceholderPage() {
    return (
        <div className="flex h-screen items-center justify-center flex-col gap-4">
            <h1 className="text-2xl font-bold">Página en Construcción 🚧</h1>
            <p className="text-muted-foreground">Esta funcionalidad estará disponible pronto.</p>
            <Link href="/admin/dashboard" className="text-primary hover:underline">Volver al Dashboard</Link>
        </div>
    );
}
