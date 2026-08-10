'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ArrowLeft,
  ClipboardList,
  Factory,
  Flag,
  FolderOpen,
  LayoutDashboard,
  Megaphone,
  Package,
  Shield,
  ShoppingCart,
  Users,
  ClipboardCheck,
  FileClock,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/admin', label: 'Vue d\'ensemble', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Utilisateurs', icon: Users },
  { href: '/admin/suppliers', label: 'Fournisseurs', icon: Factory },
  { href: '/admin/subscription-requests', label: 'Demandes d\'abonnement', icon: ClipboardCheck },
  { href: '/admin/onboarding', label: 'Onboarding', icon: FileClock },
  { href: '/admin/products', label: 'Produits', icon: Package },
  { href: '/admin/orders', label: 'Commandes', icon: ShoppingCart },
  { href: '/admin/categories', label: 'Catégories', icon: FolderOpen },
  { href: '/admin/hero', label: 'Hero du site', icon: Megaphone },
  { href: '/admin/reports', label: 'Signalements', icon: Flag },
  { href: '/admin/audit', label: 'Journal d\'audit', icon: ClipboardList },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Shield className="h-5 w-5" strokeWidth={1.9} />
            Admin Panel
          </h1>
          <p className="text-xs text-gray-400">AgriTun</p>
        </div>
        <nav className="flex-1 py-4">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2.5 text-sm transition ${
                  isActive ? 'bg-gray-800 text-white font-medium' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                  <item.icon className="h-4 w-4 shrink-0" strokeWidth={1.8} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-gray-800">
          <Link href="/" className="text-xs text-gray-400 hover:text-white transition">
              <span className="inline-flex items-center gap-1.5">
                <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.8} />
                Retour au Accueil
              </span>
          </Link>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 bg-background">
        <header className="border-b px-6 py-4">
          <h2 className="text-lg font-semibold">Administration</h2>
        </header>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
