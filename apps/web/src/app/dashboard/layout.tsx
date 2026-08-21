"use client";

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BrandLogo } from '@/components/layout/brand-logo';
import { useI18n } from '@/components/providers/locale-provider';
import type { Locale } from '@/lib/i18n/config';
import {
  Bell,
  Boxes,
  CalendarDays,
  FileText,
  LayoutDashboard,
  Languages,
  LogOut,
  Package,
  ReceiptText,
  Settings2,
  ShoppingCart,
  LineChart,
  Tags,
  UserCircle2,
} from 'lucide-react';

interface MeUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

interface DashboardNotification {
  _id: string;
  title: string;
  body: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { t, locale, setLocale } = useI18n();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  const { data: meData } = useQuery({
    queryKey: ['auth-me'],
    queryFn: async () => {
      const res = await fetch('/api/auth/me');
      if (!res.ok) return { user: null };
      return res.json();
    },
    staleTime: 60_000,
    retry: false,
  });

  const user: MeUser | null = meData?.user ?? null;

  // The supplier dashboard is for suppliers only. Other authenticated roles
  // (training centers, engineers) belong in their own spaces.
  useEffect(() => {
    if (!user) return;
    if (user.role === 'TRAINING_CENTER') {
      router.replace('/engineer/dashboard');
    } else if (user.role === 'AGRI_ENGINEER') {
      router.replace('/engineer/dashboard');
    } else if (user.role === 'ADMIN') {
      // Admins can visit if they want, no redirect.
    }
  }, [user, router]);

  const { data: notificationsData } = useQuery({
    queryKey: ['dashboard-notifications', user?.id],
    queryFn: async () => {
      const res = await fetch('/api/notifications?limit=5');
      if (!res.ok) return { notifications: [], unreadCount: 0 };
      return res.json();
    },
    enabled: !!user,
    staleTime: 30_000,
    retry: false,
  });

  const notifications: DashboardNotification[] = notificationsData?.notifications || [];
  const unreadCount = notificationsData?.unreadCount || 0;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) {
        setAvatarOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(target)) {
        setNotificationsOpen(false);
      }
    }

    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setAvatarOpen(false);
        setNotificationsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    queryClient.setQueryData(['auth-me'], { user: null });
    setAvatarOpen(false);
    setNotificationsOpen(false);
    router.push('/');
    router.refresh();
  }

  async function markAllNotificationsRead() {
    await fetch('/api/notifications', { method: 'PATCH' });
    queryClient.invalidateQueries({ queryKey: ['dashboard-notifications', user?.id] });
  }

  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.trim() || 'U';

  const sidebarItems = [
    { href: '/dashboard/overview', label: t('dashboardLayout.navOverview'), icon: LayoutDashboard },
    { href: '/dashboard/products', label: t('dashboardLayout.navProducts'), icon: Package },
    { href: '/dashboard/orders', label: t('dashboardLayout.navOrders'), icon: ShoppingCart },
    { href: '/dashboard/stock', label: t('dashboardLayout.navStock'), icon: Boxes },
    { href: '/dashboard/quotes', label: t('dashboardLayout.navQuotes'), icon: FileText },
    { href: '/dashboard/invoices', label: t('dashboardLayout.navInvoices'), icon: ReceiptText },
    { href: '/dashboard/analytics', label: t('dashboardLayout.navAnalytics'), icon: LineChart },
    { href: '/dashboard/events', label: t('dashboardLayout.navEvents'), icon: CalendarDays },
    { href: '/dashboard/promotions', label: t('dashboardLayout.navPromotions'), icon: Tags },
  ];

  // Allow SUPER_SUPPLIER to access the super-lists management UI
  if (user?.role === 'SUPER_SUPPLIER') {
    sidebarItems.push({ href: '/dashboard/super-lists', label: 'Liste Prime', icon: Tags });
  }

  // Always show settings as last item
  sidebarItems.push({ href: '/dashboard/settings', label: t('dashboardLayout.navSettings'), icon: Settings2 });

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card hidden lg:block">
        <div className="p-6">
          <BrandLogo href="/" imageClassName="h-28 w-28" />
        </div>
        <nav className="px-3 space-y-1">
          {sidebarItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
            >
              <item.icon className="h-4 w-4" strokeWidth={1.75} />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        <header className="h-16 border-b flex items-center justify-between px-6 bg-card sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <BrandLogo href="/" imageClassName="h-16 w-16" />
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 rounded-full border px-3 py-1.5">
              <Languages className="h-4 w-4 text-muted-foreground" />
              <select
                aria-label={t('dashboardLayout.language')}
                value={locale}
                onChange={(e) => setLocale(e.target.value as Locale)}
                className="bg-transparent text-sm outline-none"
              >
                <option value="fr">FR</option>
                <option value="en">EN</option>
                <option value="ar">AR</option>
              </select>
            </div>

            <div className="relative" ref={notificationsRef}>
              <button
                type="button"
                onClick={() => {
                  setNotificationsOpen((open) => !open);
                  setAvatarOpen(false);
                }}
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border bg-background hover:bg-muted transition-colors"
                aria-label={t('dashboardLayout.notifications')}
                aria-expanded={notificationsOpen}
              >
                <Bell className="h-5 w-5" strokeWidth={1.8} />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-lg border bg-background shadow-lg overflow-hidden z-50">
                  <div className="flex items-center justify-between border-b px-4 py-3">
                    <div>
                      <p className="font-semibold text-sm">{t('dashboardLayout.notifications')}</p>
                      <p className="text-xs text-muted-foreground">
                        {unreadCount} {unreadCount > 1 ? t('dashboardLayout.unreadPlural') : t('dashboardLayout.unreadSingle')}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={markAllNotificationsRead}
                      className="text-xs font-medium text-primary hover:underline"
                      disabled={unreadCount === 0}
                    >
                      {t('dashboardLayout.markAllRead')}
                    </button>
                  </div>
                  <div className="max-h-96 overflow-auto">
                    {notifications.length === 0 ? (
                      <p className="px-4 py-6 text-sm text-muted-foreground text-center">{t('dashboardLayout.noNotifications')}</p>
                    ) : (
                      notifications.map((notification) => {
                        const content = (
                          <div className="px-4 py-3 hover:bg-muted transition-colors">
                            <div className="flex items-start gap-3">
                              <span className={`mt-1 h-2.5 w-2.5 rounded-full ${notification.isRead ? 'bg-muted-foreground/30' : 'bg-primary'}`} />
                              <div className="min-w-0 flex-1">
                                <p className={`text-sm ${notification.isRead ? 'font-normal' : 'font-semibold'}`}>
                                  {notification.title}
                                </p>
                                <p className="text-xs text-muted-foreground line-clamp-2">{notification.body}</p>
                              </div>
                            </div>
                          </div>
                        );

                        if (notification.link) {
                          return (
                            <Link
                              key={notification._id}
                              href={notification.link}
                              onClick={() => setNotificationsOpen(false)}
                              className="block border-b last:border-b-0"
                            >
                              {content}
                            </Link>
                          );
                        }

                        return (
                          <div key={notification._id} className="border-b last:border-b-0">
                            {content}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => {
                  setAvatarOpen((open) => !open);
                  setNotificationsOpen(false);
                }}
                className="flex items-center gap-2 rounded-full border bg-background px-3 py-1.5 text-sm hover:bg-muted transition-colors"
                aria-label={t('dashboardLayout.userMenu')}
                aria-expanded={avatarOpen}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  {initials}
                </span>
                <span className="hidden sm:inline font-medium">
                  {user ? `${user.firstName} ${user.lastName}` : t('dashboardLayout.accountFallback')}
                </span>
                <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {avatarOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-lg border bg-background shadow-lg py-1 z-50">
                  <div className="px-4 py-3 border-b">
                    <p className="text-sm font-semibold">{user ? `${user.firstName} ${user.lastName}` : t('dashboardLayout.userFallback')}</p>
                    <p className="text-xs text-muted-foreground">{user?.email || '—'}</p>
                    {user?.role && (
                      <span className="inline-block mt-2 rounded bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                        {user.role}
                      </span>
                    )}
                  </div>

                  <Link
                    href="/dashboard/settings"
                    className="block px-4 py-2 text-sm hover:bg-muted transition-colors"
                    onClick={() => setAvatarOpen(false)}
                  >
                    <span className="flex items-center gap-2">
                      <Settings2 className="h-4 w-4" strokeWidth={1.8} />
                      {t('dashboardLayout.navSettings')}
                    </span>
                  </Link>
                  <Link
                    href="/dashboard/invoices"
                    className="block px-4 py-2 text-sm hover:bg-muted transition-colors"
                    onClick={() => setAvatarOpen(false)}
                  >
                    <span className="flex items-center gap-2">
                      <ReceiptText className="h-4 w-4" strokeWidth={1.8} />
                      {t('dashboardLayout.navInvoices')}
                    </span>
                  </Link>
                  <Link
                    href="/dashboard/overview"
                    className="block px-4 py-2 text-sm hover:bg-muted transition-colors"
                    onClick={() => setAvatarOpen(false)}
                  >
                    <span className="flex items-center gap-2">
                      <LayoutDashboard className="h-4 w-4" strokeWidth={1.8} />
                      {t('dashboardLayout.navOverview')}
                    </span>
                  </Link>
                  <div className="border-t my-1" />
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-muted transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <LogOut className="h-4 w-4" strokeWidth={1.8} />
                      {t('dashboardLayout.logout')}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="flex-1 p-6 bg-muted/30">{children}</main>
      </div>
    </div>
  );
}
