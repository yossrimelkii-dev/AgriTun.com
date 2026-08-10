'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/components/providers/locale-provider';

type Invoice = {
  _id: string;
  invoiceNumber: string;
  status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED' | string;
  issuedAt: string;
  dueAt?: string;
  paidAt?: string;
  supplierId?: string;
  buyerId?: string;
  supplierInfo?: {
    name?: string;
    address?: string;
    city?: string;
    taxId?: string;
    phone?: string;
    email?: string;
    logo?: string;
    website?: string;
    tier?: 'FREE' | 'PRIME' | 'SUPER';
    isVerified?: boolean;
  };
  buyerInfo?: {
    name?: string;
    address?: string;
    city?: string;
    taxId?: string;
    phone?: string;
    email?: string;
  };
  lineItems?: Array<{
    description?: string;
    qty?: number;
    unitPrice?: number;
    subtotal?: number;
  }>;
  totals?: {
    subtotalHT?: number;
    tvaRate?: number;
    tvaAmount?: number;
    totalTTC?: number;
    currency?: string;
  };
  notes?: string;
};

const OWNER_ROLES = new Set(['SUPPLIER', 'SUPPLIER_PRIME', 'SUPER_SUPPLIER', 'ADMIN']);

const STATUS_TONE: Record<string, string> = {
  DRAFT: 'bg-amber-100 text-amber-800 border-amber-200',
  SENT: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  PAID: 'bg-green-100 text-green-800 border-green-200',
  OVERDUE: 'bg-red-100 text-red-800 border-red-200',
  CANCELLED: 'bg-gray-100 text-gray-800 border-gray-200',
};

export default function InvoicePrintPage() {
  const { id } = useParams<{ id: string }>();
  const { t, locale } = useI18n();

  const numberLocale = locale === 'ar' ? 'ar-TN' : locale === 'en' ? 'en-US' : 'fr-TN';
  const dateLocale = locale === 'ar' ? 'ar-TN' : locale === 'en' ? 'en-GB' : 'fr-FR';

  const invoiceQuery = useQuery({
    queryKey: ['invoice-print', id],
    queryFn: async () => {
      const res = await fetch(`/api/invoices/${id}`);
      if (!res.ok) throw new Error('Invoice not found');
      return res.json();
    },
    enabled: !!id,
  });

  const meQuery = useQuery({
    queryKey: ['auth-me'],
    queryFn: async () => {
      const res = await fetch('/api/auth/me');
      if (!res.ok) return { user: null };
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const invoice: Invoice | undefined = invoiceQuery.data?.invoice;
  const currency = invoice?.totals?.currency || 'TND';

  const formatPrice = (n: number | undefined) =>
    new Intl.NumberFormat(numberLocale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n ?? 0);

  const formatDate = (d?: string | Date) =>
    d
      ? new Date(d).toLocaleDateString(dateLocale, { dateStyle: 'long' })
      : '—';

  const isOverdue = useMemo(() => {
    if (!invoice) return false;
    if (invoice.status === 'PAID' || invoice.status === 'CANCELLED') return false;
    if (!invoice.dueAt) return false;
    return new Date(invoice.dueAt).getTime() < Date.now();
  }, [invoice]);

  const canEdit = useMemo(() => {
    if (!invoice) return false;
    const user = meQuery.data?.user;
    if (!user) return false;
    if (!OWNER_ROLES.has(user.role)) return false;
    if (user.role === 'ADMIN') return true;
    return user.supplierId && invoice.supplierId?.toString() === user.supplierId;
  }, [invoice, meQuery.data]);

  const statusLabel = (s: string) => {
    if (s === 'DRAFT') return t('invoicePrint.statusDraft');
    if (s === 'SENT') return t('invoicePrint.statusSent');
    if (s === 'PAID') return t('invoicePrint.statusPaid');
    if (s === 'OVERDUE') return t('invoicePrint.statusOverdue');
    if (s === 'CANCELLED') return t('invoicePrint.statusCancelled', 'Cancelled');
    return s;
  };

  const stampConfig = useMemo(() => {
    if (!invoice) return null;
    if (invoice.status === 'PAID')
      return { label: t('invoicePrint.stampPaid'), color: 'text-emerald-600 border-emerald-600' };
    if (invoice.status === 'CANCELLED')
      return { label: t('invoicePrint.stampCancelled'), color: 'text-gray-500 border-gray-500' };
    if (isOverdue) return { label: t('invoicePrint.stampOverdue'), color: 'text-red-600 border-red-600' };
    if (invoice.status === 'DRAFT')
      return { label: t('invoicePrint.stampDraft'), color: 'text-amber-600 border-amber-600' };
    return null;
  }, [invoice, isOverdue, t]);

  if (invoiceQuery.isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 py-8 print-page">
        <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-8 space-y-6">
          <div className="h-8 w-1/3 bg-muted animate-pulse rounded" />
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="h-4 w-1/2 bg-muted animate-pulse rounded" />
              <div className="h-4 w-2/3 bg-muted animate-pulse rounded" />
              <div className="h-4 w-1/3 bg-muted animate-pulse rounded" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-1/2 bg-muted animate-pulse rounded" />
              <div className="h-4 w-2/3 bg-muted animate-pulse rounded" />
            </div>
          </div>
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-10 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (invoiceQuery.isError || !invoice) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-lg shadow p-8 text-center space-y-4">
          <div className="text-4xl">📄</div>
          <h1 className="text-xl font-bold">{t('invoicePrint.notFound')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('invoicePrint.notFoundHint')}
          </p>
          <Button variant="outline" onClick={() => window.history.back()}>
            {t('invoicePrint.back')}
          </Button>
        </div>
      </div>
    );
  }

  const tvaRatePercent =
    invoice.totals?.tvaRate && invoice.totals.tvaRate > 0 && invoice.totals.tvaRate <= 1
      ? Math.round(invoice.totals.tvaRate * 100)
      : invoice.totals?.tvaRate ?? 19;

  return (
    <div className="min-h-screen bg-slate-50 py-6 md:py-10 print-page">
      {/* Top toolbar (screen only) */}
      <div className="no-print max-w-4xl mx-auto px-4 md:px-0 mb-4 flex items-center justify-between gap-3 flex-wrap">
        <Button variant="ghost" onClick={() => window.history.back()}>
          ← {t('invoicePrint.back')}
        </Button>
        <div className="flex items-center gap-2 flex-wrap">
          {canEdit && (
            <Link
              href={`/dashboard/invoices/${invoice._id}/edit`}
              className="inline-flex items-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
            >
              ✎ {t('invoicePrint.edit')}
            </Link>
          )}
          <Button variant="outline" onClick={() => window.print()}>
            ⤓ {t('invoicePrint.downloadPdf')}
          </Button>
          <Button onClick={() => window.print()}>
            🖨 {t('invoicePrint.print')}
          </Button>
        </div>
      </div>

      {/* Invoice document */}
      <div className="max-w-4xl mx-auto bg-white shadow-xl rounded-lg overflow-hidden print-shadow-none print-avoid-break">
        {/* Slim colored accent stripe */}
        <div className="h-1.5 bg-gradient-to-r from-primary via-primary/80 to-secondary" />

        {/* Professional white header */}
        <div className="px-6 md:px-12 pt-8 pb-6 border-b border-slate-200 flex items-start justify-between gap-6 flex-wrap">
          {/* Left: identity */}
          <div className="flex items-start gap-5 min-w-0 max-w-xl">
            {invoice.supplierInfo?.logo ? (
              <div className="w-24 h-24 rounded-xl border border-slate-200 bg-white p-2 shrink-0 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={invoice.supplierInfo.logo}
                  alt={`${invoice.supplierInfo?.name || 'Supplier'} logo`}
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 flex items-center justify-center text-3xl font-bold text-primary shrink-0">
                {invoice.supplierInfo?.name?.[0]?.toUpperCase() || 'F'}
              </div>
            )}
            <div className="min-w-0 pt-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight leading-tight">
                  {invoice.supplierInfo?.name || t('invoicePrint.supplierFallback')}
                </h1>
                {invoice.supplierInfo?.isVerified && (
                  <span
                    className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-500 text-white text-[10px] shrink-0"
                    title={t('invoicePrint.verified')}
                    aria-label={t('invoicePrint.verified')}
                  >
                    ✓
                  </span>
                )}
              </div>
              {invoice.supplierInfo?.tier && invoice.supplierInfo.tier !== 'FREE' && (
                <div className="mt-1.5">
                  {invoice.supplierInfo.tier === 'SUPER' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-gradient-to-r from-amber-400 to-yellow-500 text-white shadow-sm">
                      ★ {t('invoicePrint.tierSuper')}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-gradient-to-r from-slate-800 to-slate-700 text-white shadow-sm">
                      ◆ {t('invoicePrint.tierPrime')}
                    </span>
                  )}
                </div>
              )}
              <div className="mt-3 space-y-0.5 text-sm text-slate-600">
                {invoice.supplierInfo?.address && (
                  <p>{invoice.supplierInfo.address}</p>
                )}
                {invoice.supplierInfo?.city && (
                  <p>{invoice.supplierInfo.city}</p>
                )}
                {(invoice.supplierInfo?.phone || invoice.supplierInfo?.email) && (
                  <p className="pt-1 text-xs text-slate-500">
                    {invoice.supplierInfo?.phone && (
                      <span>{invoice.supplierInfo.phone}</span>
                    )}
                    {invoice.supplierInfo?.phone && invoice.supplierInfo?.email && (
                      <span className="mx-1.5">·</span>
                    )}
                    {invoice.supplierInfo?.email && (
                      <span>{invoice.supplierInfo.email}</span>
                    )}
                  </p>
                )}
                {invoice.supplierInfo?.website && (
                  <p className="text-xs text-slate-500">{invoice.supplierInfo.website}</p>
                )}
                {invoice.supplierInfo?.taxId && (
                  <p className="text-xs text-slate-500 pt-1">
                    {t('invoicePrint.taxId')}: <span className="font-medium text-slate-700">{invoice.supplierInfo.taxId}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Right: invoice meta */}
          <div className="text-right shrink-0 ml-auto">
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500 font-semibold">
              {t('invoicePrint.titleUpper')}
            </p>
            <p className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight mt-1">
              {invoice.invoiceNumber}
            </p>
            <div className="mt-3">
              <span
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${
                  STATUS_TONE[isOverdue && invoice.status !== 'PAID' ? 'OVERDUE' : invoice.status] ||
                  'bg-gray-100 text-gray-700 border-gray-200'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                {isOverdue && invoice.status !== 'PAID'
                  ? statusLabel('OVERDUE')
                  : statusLabel(invoice.status)}
              </span>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="relative px-6 md:px-10 py-8 space-y-8">
          {stampConfig && (
            <div
              className={`pointer-events-none absolute top-16 right-10 rotate-[-14deg] border-4 rounded-lg px-6 py-2 font-black text-3xl md:text-4xl uppercase tracking-widest opacity-25 select-none ${stampConfig.color}`}
              aria-hidden
            >
              {stampConfig.label}
            </div>
          )}

          {/* Dates row */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 pb-6 border-b">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                {t('invoicePrint.issuedOn')}
              </p>
              <p className="font-semibold">{formatDate(invoice.issuedAt)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                {t('invoicePrint.dueDate')}
              </p>
              <p className={`font-semibold ${isOverdue ? 'text-red-600' : ''}`}>
                {formatDate(invoice.dueAt)}
              </p>
            </div>
            {invoice.paidAt && (
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                  {t('invoicePrint.paidOn')}
                </p>
                <p className="font-semibold text-green-700">{formatDate(invoice.paidAt)}</p>
              </div>
            )}
          </div>

          {/* Bill To */}
          <div className="rounded-lg border border-slate-200 p-5 bg-slate-50/50 max-w-md">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-3">
              {t('invoicePrint.billTo')}
            </p>
            <p className="font-bold text-base text-slate-900">
              {invoice.buyerInfo?.name || t('invoicePrint.customerFallback')}
            </p>
            {invoice.buyerInfo?.address && (
              <p className="text-sm text-slate-600 mt-1">{invoice.buyerInfo.address}</p>
            )}
            {invoice.buyerInfo?.city && (
              <p className="text-sm text-slate-600">{invoice.buyerInfo.city}</p>
            )}
            {(invoice.buyerInfo?.phone || invoice.buyerInfo?.email) && (
              <p className="text-xs text-slate-500 mt-2">
                {invoice.buyerInfo?.phone && <span>{invoice.buyerInfo.phone}</span>}
                {invoice.buyerInfo?.phone && invoice.buyerInfo?.email && (
                  <span className="mx-1.5">·</span>
                )}
                {invoice.buyerInfo?.email && <span>{invoice.buyerInfo.email}</span>}
              </p>
            )}
            {invoice.buyerInfo?.taxId && (
              <p className="text-xs text-slate-500 mt-2">
                {t('invoicePrint.taxId')}: <span className="font-medium text-slate-700">{invoice.buyerInfo.taxId}</span>
              </p>
            )}
          </div>

          {/* Line items */}
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold uppercase tracking-wider text-xs">
                    {t('invoicePrint.designation')}
                  </th>
                  <th className="text-center px-4 py-3 font-semibold uppercase tracking-wider text-xs w-20">
                    {t('invoicePrint.quantity')}
                  </th>
                  <th className="text-right px-4 py-3 font-semibold uppercase tracking-wider text-xs w-32">
                    {t('invoicePrint.unitPrice')}
                  </th>
                  <th className="text-right px-4 py-3 font-semibold uppercase tracking-wider text-xs w-32">
                    {t('invoicePrint.amountHT')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {(invoice.lineItems || []).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                      {t('invoicePrint.noLineItems')}
                    </td>
                  </tr>
                ) : (
                  invoice.lineItems!.map((item, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-muted/20'}>
                      <td className="px-4 py-3 align-top">
                        <p className="font-medium">{item.description || '—'}</p>
                      </td>
                      <td className="px-4 py-3 text-center align-top">{item.qty ?? 0}</td>
                      <td className="px-4 py-3 text-right align-top">
                        {formatPrice(item.unitPrice)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold align-top">
                        {formatPrice(
                          item.subtotal ?? (item.qty ?? 0) * (item.unitPrice ?? 0)
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-full md:w-80 space-y-2 rounded-lg border p-4 bg-muted/20">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('invoicePrint.subtotalHT')}</span>
                <span className="font-semibold">{formatPrice(invoice.totals?.subtotalHT)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {t('invoicePrint.tax')} ({tvaRatePercent}%)
                </span>
                <span className="font-semibold">{formatPrice(invoice.totals?.tvaAmount)}</span>
              </div>
              <div className="flex justify-between pt-3 border-t text-base">
                <span className="font-bold">{t('invoicePrint.totalTTC')}</span>
                <span className="font-bold text-primary text-lg">
                  {formatPrice(invoice.totals?.totalTTC)}
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="rounded-lg bg-amber-50 border-l-4 border-amber-400 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-800 mb-1">
                {t('invoicePrint.notes')}
              </p>
              <p className="text-sm text-amber-900 whitespace-pre-wrap">{invoice.notes}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-muted/30 border-t px-6 md:px-10 py-4 text-center text-xs text-muted-foreground space-y-1">
          <p>{t('invoicePrint.thanks')}</p>
          <p>{t('invoicePrint.autoGenerated')}</p>
        </div>
      </div>
    </div>
  );
}
