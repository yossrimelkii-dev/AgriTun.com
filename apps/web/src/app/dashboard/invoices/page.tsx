'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { useI18n } from '@/components/providers/locale-provider';

interface Invoice {
  _id: string;
  invoiceNumber: string;
  status: string;
  issuedAt: string;
  dueAt: string;
  buyerInfo: { name: string; email: string };
  totals: { subtotalHT: number; tvaAmount: number; totalTTC: number; currency: string };
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-amber-100 text-amber-700',
  SENT: 'bg-emerald-100 text-emerald-700',
  PAID: 'bg-green-100 text-green-700',
  OVERDUE: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-700',
};

const EDITABLE_ROLES = new Set(['SUPPLIER', 'SUPPLIER_PRIME', 'SUPER_SUPPLIER', 'ADMIN']);

export default function DashboardInvoicesPage() {
  const { t, locale } = useI18n();

  const numberLocale = locale === 'ar' ? 'ar-TN' : locale === 'en' ? 'en-US' : 'fr-TN';
  const dateLocale = locale === 'ar' ? 'ar-TN' : locale === 'en' ? 'en-GB' : 'fr-FR';

  const formatPrice = (price: number) =>
    new Intl.NumberFormat(numberLocale, { style: 'currency', currency: 'TND', maximumFractionDigits: 0 }).format(price);

  const statusLabel = (status: string) => {
    if (status === 'DRAFT') return t('dashboardInvoices.statusDraft');
    if (status === 'SENT') return t('dashboardInvoices.statusSent');
    if (status === 'PAID') return t('dashboardInvoices.statusPaid');
    if (status === 'OVERDUE') return t('dashboardInvoices.statusOverdue');
    if (status === 'CANCELLED') return t('dashboardInvoices.statusCancelled');
    return status;
  };

  const meQuery = useQuery({
    queryKey: ['auth-me'],
    queryFn: async () => {
      const res = await fetch('/api/auth/me');
      if (!res.ok) return { user: null };
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });
  const userRole: string | undefined = meQuery.data?.user?.role;
  const canManage = !!userRole && EDITABLE_ROLES.has(userRole);

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-invoices'],
    queryFn: async () => {
      const res = await fetch('/api/invoices');
      if (res.status === 401) return { invoices: [] };
      return res.json();
    },
    retry: 1,
  });

  const invoices: Invoice[] = data?.invoices || [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">{t('dashboardInvoices.heading')}</h1>
          <p className="text-muted-foreground">{t('dashboardInvoices.subtitle')}</p>
        </div>
        {canManage && (
          <Link
            href="/dashboard/invoices/new"
            className="inline-flex items-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            + {t('dashboardInvoices.createButton')}
          </Link>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : invoices.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <p className="text-muted-foreground">{t('dashboardInvoices.empty')}</p>
            {canManage && (
              <Link
                href="/dashboard/invoices/new"
                className="inline-flex items-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                + {t('dashboardInvoices.createButton')}
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-lg overflow-hidden overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium">{t('dashboardInvoices.invoiceNumber')}</th>
                <th className="text-left px-4 py-3 text-sm font-medium">{t('dashboardInvoices.client')}</th>
                <th className="text-left px-4 py-3 text-sm font-medium">{t('dashboardInvoices.date')}</th>
                <th className="text-left px-4 py-3 text-sm font-medium">{t('dashboardInvoices.dueDate')}</th>
                <th className="text-right px-4 py-3 text-sm font-medium">{t('dashboardInvoices.ht')}</th>
                <th className="text-right px-4 py-3 text-sm font-medium">{t('dashboardInvoices.tva')}</th>
                <th className="text-right px-4 py-3 text-sm font-medium">{t('dashboardInvoices.ttc')}</th>
                <th className="text-left px-4 py-3 text-sm font-medium">{t('dashboardInvoices.status')}</th>
                <th className="text-right px-4 py-3 text-sm font-medium">{t('dashboardInvoices.action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {invoices.map((inv) => (
                <tr key={inv._id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 text-sm font-medium">{inv.invoiceNumber}</td>
                  <td className="px-4 py-3 text-sm">{inv.buyerInfo?.name || t('dashboardInvoices.notAvailable')}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {new Date(inv.issuedAt).toLocaleDateString(dateLocale)}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {new Date(inv.dueAt).toLocaleDateString(dateLocale)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right">{formatPrice(inv.totals.subtotalHT)}</td>
                  <td className="px-4 py-3 text-sm text-right">{formatPrice(inv.totals.tvaAmount)}</td>
                  <td className="px-4 py-3 text-sm text-right font-bold">{formatPrice(inv.totals.totalTTC)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_STYLES[inv.status] || 'bg-gray-100'}`}>
                      {statusLabel(inv.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/invoice/${inv._id}`}
                        className="inline-flex items-center rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors"
                      >
                        {t('dashboardInvoices.viewDetails')}
                      </Link>
                      {canManage && (
                        <Link
                          href={`/dashboard/invoices/${inv._id}/edit`}
                          className="inline-flex items-center rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors"
                        >
                          {t('dashboardInvoices.editAction')}
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
