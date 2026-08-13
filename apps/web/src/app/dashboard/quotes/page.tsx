'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { useI18n } from '@/components/providers/locale-provider';

interface Quote {
  _id: string;
  quoteNumber: string;
  status: string;
  issuedAt: string;
  validUntil: string;
  convertedInvoiceId?: string;
  buyerInfo: { name: string; email?: string };
  totals: { subtotalHT: number; tvaAmount: number; totalTTC: number; currency: string };
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-amber-100 text-amber-700',
  SENT: 'bg-emerald-100 text-emerald-700',
  ACCEPTED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  EXPIRED: 'bg-gray-100 text-gray-700',
  CONVERTED: 'bg-blue-100 text-blue-700',
};

const EDITABLE_ROLES = new Set(['SUPPLIER', 'SUPPLIER_PRIME', 'SUPER_SUPPLIER', 'ADMIN']);

export default function DashboardQuotesPage() {
  const { t, locale } = useI18n();
  const numberLocale = locale === 'ar' ? 'ar-TN' : locale === 'en' ? 'en-US' : 'fr-TN';
  const dateLocale = locale === 'ar' ? 'ar-TN' : locale === 'en' ? 'en-GB' : 'fr-FR';

  const formatPrice = (price: number) =>
    new Intl.NumberFormat(numberLocale, { style: 'currency', currency: 'TND', maximumFractionDigits: 0 }).format(price);

  const statusLabel = (status: string) =>
    t(`quoteList.status_${status}`, status);

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
    queryKey: ['dashboard-quotes'],
    queryFn: async () => {
      const res = await fetch('/api/quotes');
      if (res.status === 401) return { quotes: [] };
      return res.json();
    },
    retry: 1,
  });

  const quotes: Quote[] = data?.quotes || [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">{t('quoteList.heading')}</h1>
          <p className="text-muted-foreground">{t('quoteList.subtitle')}</p>
        </div>
        {canManage && (
          <Link
            href="/dashboard/quotes/new"
            className="inline-flex items-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            + {t('quoteList.createButton')}
          </Link>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : quotes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <p className="text-muted-foreground">{t('quoteList.empty')}</p>
            {canManage && (
              <Link
                href="/dashboard/quotes/new"
                className="inline-flex items-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                + {t('quoteList.createButton')}
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-lg overflow-hidden overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium">{t('quoteList.quoteNumber')}</th>
                <th className="text-left px-4 py-3 text-sm font-medium">{t('quoteList.client')}</th>
                <th className="text-left px-4 py-3 text-sm font-medium">{t('quoteList.date')}</th>
                <th className="text-left px-4 py-3 text-sm font-medium">{t('quoteList.validUntil')}</th>
                <th className="text-right px-4 py-3 text-sm font-medium">{t('quoteList.ttc')}</th>
                <th className="text-left px-4 py-3 text-sm font-medium">{t('quoteList.status')}</th>
                <th className="text-right px-4 py-3 text-sm font-medium">{t('quoteList.action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {quotes.map((q) => (
                <tr key={q._id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 text-sm font-medium">{q.quoteNumber}</td>
                  <td className="px-4 py-3 text-sm">{q.buyerInfo?.name || '—'}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {new Date(q.issuedAt).toLocaleDateString(dateLocale)}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {q.validUntil ? new Date(q.validUntil).toLocaleDateString(dateLocale) : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-bold">{formatPrice(q.totals.totalTTC)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_STYLES[q.status] || 'bg-gray-100'}`}>
                      {statusLabel(q.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/quote/${q._id}`}
                        className="inline-flex items-center rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors"
                      >
                        {t('quoteList.viewDetails')}
                      </Link>
                      {canManage && q.status !== 'CONVERTED' && (
                        <Link
                          href={`/dashboard/quotes/${q._id}/edit`}
                          className="inline-flex items-center rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors"
                        >
                          {t('quoteList.editAction')}
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
