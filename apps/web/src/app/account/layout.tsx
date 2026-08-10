'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { Heart, MessageCircle, Package, User } from 'lucide-react';
import { useI18n } from '@/components/providers/locale-provider';

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t } = useI18n();

  const accountLinks = [
    { href: '/account', label: t('accountLayout.profile'), icon: User },
    { href: '/account/orders', label: t('accountLayout.orders'), icon: Package },
    { href: '/account/wishlist', label: t('accountLayout.wishlist'), icon: Heart },
    { href: '/account/messages', label: t('accountLayout.messages'), icon: MessageCircle },
    { href: '/account/agri-help', label: t('accountLayout.agriHelp'), icon: MessageCircle },
  ];

  return (
    <>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8 min-h-screen">
        <h1 className="text-2xl font-bold mb-6">{t('accountLayout.heading')}</h1>
        <div className="flex gap-8">
          <aside className="w-60 shrink-0 hidden md:block">
            <nav className="space-y-1">
              {accountLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition ${
                    pathname === link.href
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                    <link.icon className="h-4 w-4 shrink-0" strokeWidth={1.8} />
                  {link.label}
                </Link>
              ))}
            </nav>
          </aside>
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
      <Footer />
    </>
  );
}
