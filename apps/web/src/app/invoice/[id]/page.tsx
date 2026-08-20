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
        {/* Premium header — logo forward, subtle brand backdrop */}
        <div className="relative overflow-hidden border-b border-slate-200">
          {/* Layered decorative brand backdrop */}
          <div aria-hidden className="absolute inset-0 bg-gradient-to-br from-primary/8 via-white to-secondary/5" />
          <div aria-hidden className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-primary/10 blur-3xl" />
          <div aria-hidden className="absolute -bottom-20 -left-16 w-64 h-64 rounded-full bg-secondary/10 blur-3xl" />
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-primary via-primary/80 to-secondary"
          />

          <div className="relative px-6 md:px-10 pt-8 pb-6 flex items-start justify-between gap-6 flex-wrap">
            <div className="flex items-center gap-5 min-w-0">
              {/* Logo — framed, generous, with subtle accent ring */}
              <div className="relative shrink-0">
                <div
                  aria-hidden
                  className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-primary/40 via-primary/10 to-secondary/40 opacity-60 blur-sm"
                />
                {invoice.supplierInfo?.logo ? (
                  <div className="relative w-24 h-24 md:w-28 md:h-28 rounded-2xl border border-slate-200 bg-white p-2.5 shadow-md ring-1 ring-slate-900/5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={invoice.supplierInfo.logo}
                      alt={`${invoice.supplierInfo?.name || 'Supplier'} logo`}
                      className="w-full h-full object-contain"
                    />
                    {invoice.supplierInfo?.isVerified && (
                      <span
                        className="absolute -bottom-1.5 -right-1.5 inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-xs shadow-md ring-2 ring-white"
                        title={t('invoicePrint.verified')}
                        aria-label={t('invoicePrint.verified')}
                      >
                        ✓
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="relative w-24 h-24 md:w-28 md:h-28 rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-white flex items-center justify-center text-4xl md:text-5xl font-bold shadow-md ring-1 ring-white/20">
                    {invoice.supplierInfo?.name?.[0]?.toUpperCase() || 'F'}
                    {invoice.supplierInfo?.isVerified && (
                      <span
                        className="absolute -bottom-1.5 -right-1.5 inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-xs shadow-md ring-2 ring-white"
                        title={t('invoicePrint.verified')}
                        aria-label={t('invoicePrint.verified')}
                      >
                        ✓
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-semibold mb-1">
                  {t('invoicePrint.supplierFallback', 'Supplier')}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight leading-tight">
                    {invoice.supplierInfo?.name || t('invoicePrint.supplierFallback')}
                  </h1>
                  {invoice.supplierInfo?.tier === 'SUPER' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r from-amber-400 to-yellow-500 text-white shadow-sm">
                      ★ {t('invoicePrint.tierSuper')}
                    </span>
                  )}
                  {invoice.supplierInfo?.tier === 'PRIME' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r from-slate-800 to-slate-700 text-white shadow-sm">
                      ◆ {t('invoicePrint.tierPrime')}
                    </span>
                  )}
                </div>
                {invoice.supplierInfo?.taxId && (
                  <p className="text-xs text-slate-500 mt-1">
                    {t('invoicePrint.taxId')}:{' '}
                    <span className="font-medium text-slate-700 tracking-wide">
                      {invoice.supplierInfo.taxId}
                    </span>
                  </p>
                )}
              </div>
            </div>

            <div className="text-right shrink-0 ml-auto">
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500 font-semibold">
                {t('invoicePrint.titleUpper')}
              </p>
              <p className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight mt-0.5">
                {invoice.invoiceNumber}
              </p>
              <div className="mt-2">
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
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
        </div>

        {/* Body — compact for one-page fit */}
        <div className="relative px-6 md:px-10 py-5 space-y-5">
          {stampConfig && (
            <div
              className={`pointer-events-none absolute top-14 right-10 rotate-[-14deg] border-4 rounded-lg px-5 py-1.5 font-black text-2xl md:text-3xl uppercase tracking-widest opacity-25 select-none ${stampConfig.color}`}
              aria-hidden
            >
              {stampConfig.label}
            </div>
          )}

          {/* Bill To + Dates on ONE line */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-4 border-b">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-1">
                {t('invoicePrint.billTo')}
              </p>
              <p className="font-bold text-sm text-slate-900 leading-tight">
                {invoice.buyerInfo?.name || t('invoicePrint.customerFallback')}
              </p>
              {invoice.buyerInfo?.email && (
                <p className="text-xs text-slate-500 mt-0.5 truncate">{invoice.buyerInfo.email}</p>
              )}
              {invoice.buyerInfo?.phone && (
                <p className="text-xs text-slate-500 truncate">{invoice.buyerInfo.phone}</p>
              )}
              {invoice.buyerInfo?.taxId && (
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {t('invoicePrint.taxId')}: <span className="text-slate-700 font-medium">{invoice.buyerInfo.taxId}</span>
                </p>
              )}
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-1">
                {t('invoicePrint.issuedOn')}
              </p>
              <p className="font-semibold text-sm">{formatDate(invoice.issuedAt)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-1">
                {t('invoicePrint.dueDate')}
              </p>
              <p className={`font-semibold text-sm ${isOverdue ? 'text-red-600' : ''}`}>
                {formatDate(invoice.dueAt)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-1">
                {t('invoicePrint.paidOn')}
              </p>
              <p className={`font-semibold text-sm ${invoice.paidAt ? 'text-green-700' : 'text-slate-400'}`}>
                {invoice.paidAt ? formatDate(invoice.paidAt) : '—'}
              </p>
            </div>
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
            <div className="w-full md:w-72 space-y-1.5 rounded-lg border p-3 bg-muted/20">
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
              <div className="flex justify-between pt-2 border-t">
                <span className="font-bold text-sm">{t('invoicePrint.totalTTC')}</span>
                <span className="font-bold text-primary text-base">
                  {formatPrice(invoice.totals?.totalTTC)}
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="rounded-lg bg-amber-50 border-l-4 border-amber-400 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800 mb-0.5">
                {t('invoicePrint.notes')}
              </p>
              <p className="text-xs text-amber-900 whitespace-pre-wrap">{invoice.notes}</p>
            </div>
          )}
        </div>

        {/* Supplier contact bar + footer */}
        <div className="bg-muted/30 border-t px-6 md:px-10 py-4 text-xs text-slate-600">
          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-0.5">
              {invoice.supplierInfo?.address && <p>{invoice.supplierInfo.address}</p>}
              {invoice.supplierInfo?.city && <p>{invoice.supplierInfo.city}</p>}
              {(invoice.supplierInfo?.phone || invoice.supplierInfo?.email) && (
                <p>
                  {invoice.supplierInfo?.phone}
                  {invoice.supplierInfo?.phone && invoice.supplierInfo?.email && (
                    <span className="mx-1">·</span>
                  )}
                  {invoice.supplierInfo?.email}
                </p>
              )}
              {invoice.supplierInfo?.website && <p>{invoice.supplierInfo.website}</p>}
            </div>
            <div className="space-y-0.5 md:text-right">
              {invoice.supplierInfo?.taxId && (
                <p>
                  {t('invoicePrint.taxId')}:{' '}
                  <span className="font-medium text-slate-700">{invoice.supplierInfo.taxId}</span>
                </p>
              )}
              {(invoice as any).paymentMethod && (
                <p>
                  {t('invoicePrint.paymentMethod')}:{' '}
                  <span className="font-medium text-slate-700">
                    {t(`invoicePrint.paymentMethod_${(invoice as any).paymentMethod}`, (invoice as any).paymentMethod)}
                  </span>
                </p>
              )}
            </div>
          </div>
          <p className="text-center text-[11px] text-slate-500 mt-3 pt-3 border-t border-slate-200/60">
            {t('invoicePrint.thanks')} · {t('invoicePrint.autoGenerated')}
          </p>
        </div>
      </div>
    </div>
  );
}
