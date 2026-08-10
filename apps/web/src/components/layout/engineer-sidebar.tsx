'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, BookOpen, Calendar, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

export function EngineerSidebar() {
  const pathname = usePathname();

  const menuItems = [
    { href: '/engineer/dashboard', label: 'Dashboard', icon: Home },
    { href: '/engineer/dashboard/formations', label: 'Formations', icon: BookOpen },
    { href: '/engineer/dashboard/events', label: 'Événements', icon: Calendar },
  ];

  return (
    <aside className="hidden lg:flex w-64 flex-col border-r bg-background">
      <div className="flex h-16 items-center border-b px-6">
        <h2 className="text-lg font-semibold">Spécialiste</h2>
      </div>

      <nav className="flex-1 space-y-2 p-4">
        {menuItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-4">
        <Link
          href="/engineer/profile"
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
        >
          Modifier mon profil
        </Link>
      </div>
    </aside>
  );
}
