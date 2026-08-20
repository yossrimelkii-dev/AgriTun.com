'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/components/providers/locale-provider';
import { useToast } from '@/hooks/use-toast';

type Quote = {
  _id: string;
  quoteNumber: string;
  status: string;
  issuedAt: string;
  validUntil?: string;
  supplierId?: string;
  convertedInvoiceId?: string;
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
  lineItems?: Array<{ description?: string; qty?: number; unitPrice?: number; subtotal?: number }>;
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
  ACCEPTED: 'bg-green-100 text-green-800 border-green-200',
  REJECTED: 'bg-red-100 text-red-800 border-red-200',
  EXPIRED: 'bg-gray-100 text-gray-800 border-gray-200',
  CONVERTED: 'bg-blue-100 text-blue-800 border-blue-200',
};

export default function QuotePrintPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const [converting, setConverting] = useState(false);

  const numberLocale = locale === 'ar' ? 'ar-TN' : locale === 'en' ? 'en-US' : 'fr-TN';
  const dateLocale = locale === 'ar' ? 'ar-TN' : locale === 'en' ? 'en-GB' : 'fr-FR';

  const quoteQuery = useQuery({
    queryKey: ['quote-print', id],
    queryFn: async () => {
      const res = await fetch(`/api/quotes/${id}`);
      if (!res.ok) throw new Error('Quote not found');
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

  const quote: Quote | undefined = quoteQuery.data?.quote;
  const currency = quote?.totals?.currency || 'TND';

  const formatPrice = (n: number | undefined) =>
    new Intl.NumberFormat(numberLocale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n ?? 0);

  const formatDate = (d?: string | Date) =>
    d ? new Date(d).toLocaleDateString(dateLocale, { dateStyle: 'long' }) : '—';

  const canManage = useMemo(() => {
    if (!quote) return false;
    const user = meQuery.data?.user;
    if (!user) return false;
    if (!OWNER_ROLES.has(user.role)) return false;
    if (user.role === 'ADMIN') return true;
    return user.supplierId && quote.supplierId?.toString() === user.supplierId;
  }, [quote, meQuery.data]);

  const statusLabel = (s: string) => t(`quotePrint.status_${s}`, s);

  async function convertToInvoice() {
    if (!quote) return;
    if (!confirm(t('quotePrint.confirmConvert'))) return;
    setConverting(true);
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quoteId: quote._id, status: 'SENT' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed');
      toast({ title: t('quotePrint.convertedToast') });
      qc.invalidateQueries({ queryKey: ['quote-print', id] });
      router.push(`/invoice/${json.invoice._id}`);
    } catch (err: any) {
      toast({ title: t('quotePrint.convertFailed'), description: err?.message });
    } finally {
      setConverting(false);
    }
  }

  if (quoteQuery.isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 py-8 print-page">
        <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-8 space-y-6">
          <div className="h-8 w-1/3 bg-muted animate-pulse rounded" />
          <div className="h-64 bg-muted animate-pulse rounded" />
        </div>
      </div>
    );
  }

  if (quoteQuery.isError || !quote) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-lg shadow p-8 text-center space-y-4">
          <div className="text-4xl">📄</div>
          <h1 className="text-xl font-bold">{t('quotePrint.notFound')}</h1>
          <Button variant="outline" onClick={() => window.history.back()}>
            {t('invoicePrint.back')}
          </Button>
        </div>
      </div>
    );
  }

  const tvaRatePercent =
    quote.totals?.tvaRate && quote.totals.tvaRate > 0 && quote.totals.tvaRate <= 1
      ? Math.round(quote.totals.tvaRate * 100)
      : quote.totals?.tvaRate ?? 19;

  return (
    <div className="min-h-screen bg-slate-50 py-6 md:py-10 print-page">
      {/* Top toolbar */}
      <div className="no-print max-w-4xl mx-auto px-4 md:px-0 mb-4 flex items-center justify-between gap-3 flex-wrap">
        <Button variant="ghost" onClick={() => window.history.back()}>
          ← {t('invoicePrint.back')}
        </Button>
        <div className="flex items-center gap-2 flex-wrap">
          {canManage && quote.status !== 'CONVERTED' && (
            <Link
              href={`/dashboard/quotes/${quote._id}/edit`}
              className="inline-flex items-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
            >
              ✎ {t('invoicePrint.edit')}
            </Link>
          )}
          {canManage && quote.status !== 'CONVERTED' && (
            <Button onClick={convertToInvoice} disabled={converting}>
              → {converting ? t('quotePrint.converting') : t('quotePrint.convertToInvoice')}
            </Button>
          )}
          {quote.convertedInvoiceId && (
            <Link
              href={`/invoice/${quote.convertedInvoiceId}`}
              className="inline-flex items-center rounded-md bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              {t('quotePrint.viewInvoice')}
            </Link>
          )}
          <Button variant="outline" onClick={() => window.print()}>
            ⤓ {t('invoicePrint.downloadPdf')}
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            🖨 {t('invoicePrint.print')}
          </Button>
        </div>
      </div>

      {/* Document */}
      <div className="max-w-4xl mx-auto bg-white shadow-xl rounded-lg overflow-hidden print-shadow-none print-avoid-break">
        <div className="relative overflow-hidden border-b border-slate-200">
          <div aria-hidden className="absolute inset-0 bg-gradient-to-br from-secondary/8 via-white to-primary/5" />
          <div aria-hidden className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-secondary/10 blur-3xl" />
          <div aria-hidden className="absolute -bottom-20 -left-16 w-64 h-64 rounded-full bg-primary/10 blur-3xl" />
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-secondary via-secondary/80 to-primary"
          />

          <div className="relative px-6 md:px-10 pt-8 pb-6 flex items-start justify-between gap-6 flex-wrap">
            <div className="flex items-center gap-5 min-w-0">
              <div className="relative shrink-0">
                <div
                  aria-hidden
                  className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-secondary/40 via-secondary/10 to-primary/40 opacity-60 blur-sm"
                />
                {quote.supplierInfo?.logo ? (
                  <div className="relative w-24 h-24 md:w-28 md:h-28 rounded-2xl border border-slate-200 bg-white p-2.5 shadow-md ring-1 ring-slate-900/5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={quote.supplierInfo.logo}
                      alt={`${quote.supplierInfo?.name || 'Supplier'} logo`}
                      className="w-full h-full object-contain"
                    />
                    {quote.supplierInfo?.isVerified && (
                      <span className="absolute -bottom-1.5 -right-1.5 inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-xs shadow-md ring-2 ring-white">
                        ✓
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="relative w-24 h-24 md:w-28 md:h-28 rounded-2xl bg-gradient-to-br from-secondary to-secondary/70 text-white flex items-center justify-center text-4xl md:text-5xl font-bold shadow-md ring-1 ring-white/20">
                    {quote.supplierInfo?.name?.[0]?.toUpperCase() || 'D'}
                    {quote.supplierInfo?.isVerified && (
                      <span className="absolute -bottom-1.5 -right-1.5 inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-xs shadow-md ring-2 ring-white">
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
                    {quote.supplierInfo?.name || t('invoicePrint.supplierFallback')}
                  </h1>
                  {quote.supplierInfo?.tier === 'SUPER' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r from-amber-400 to-yellow-500 text-white shadow-sm">
                      ★ {t('invoicePrint.tierSuper')}
                    </span>
                  )}
                  {quote.supplierInfo?.tier === 'PRIME' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r from-slate-800 to-slate-700 text-white shadow-sm">
                      ◆ {t('invoicePrint.tierPrime')}
                    </span>
                  )}
                </div>
                {quote.supplierInfo?.taxId && (
                  <p className="text-xs text-slate-500 mt-1">
                    {t('invoicePrint.taxId')}:{' '}
                    <span className="font-medium text-slate-700 tracking-wide">
                      {quote.supplierInfo.taxId}
                    </span>
                  </p>
                )}
              </div>
            </div>

            <div className="text-right shrink-0 ml-auto">
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500 font-semibold">
                {t('quotePrint.titleUpper')}
              </p>
              <p className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight mt-0.5">
                {quote.quoteNumber}
              </p>
              <div className="mt-2">
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                    STATUS_TONE[quote.status] || 'bg-gray-100 text-gray-700 border-gray-200'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                  {statusLabel(quote.status)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="relative px-6 md:px-10 py-5 space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pb-4 border-b">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-1">
                {t('invoicePrint.billTo')}
              </p>
              <p className="font-bold text-sm text-slate-900 leading-tight">
                {quote.buyerInfo?.name || t('invoicePrint.customerFallback')}
              </p>
              {quote.buyerInfo?.email && (
                <p className="text-xs text-slate-500 mt-0.5 truncate">{quote.buyerInfo.email}</p>
              )}
              {quote.buyerInfo?.phone && (
                <p className="text-xs text-slate-500 truncate">{quote.buyerInfo.phone}</p>
              )}
              {quote.buyerInfo?.taxId && (
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {t('invoicePrint.taxId')}:{' '}
                  <span className="text-slate-700 font-medium">{quote.buyerInfo.taxId}</span>
                </p>
              )}
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-1">
                {t('invoicePrint.issuedOn')}
              </p>
              <p className="font-semibold text-sm">{formatDate(quote.issuedAt)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-1">
                {t('quotePrint.validUntil')}
              </p>
              <p className="font-semibold text-sm">{formatDate(quote.validUntil)}</p>
            </div>
          </div>

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
                {(quote.lineItems || []).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                      {t('invoicePrint.noLineItems')}
                    </td>
                  </tr>
                ) : (
                  quote.lineItems!.map((item, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-muted/20'}>
                      <td className="px-4 py-3 align-top">
                        <p className="font-medium">{item.description || '—'}</p>
                      </td>
                      <td className="px-4 py-3 text-center align-top">{item.qty ?? 0}</td>
                      <td className="px-4 py-3 text-right align-top">{formatPrice(item.unitPrice)}</td>
                      <td className="px-4 py-3 text-right font-semibold align-top">
                        {formatPrice(item.subtotal ?? (item.qty ?? 0) * (item.unitPrice ?? 0))}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <div className="w-full md:w-72 space-y-1.5 rounded-lg border p-3 bg-muted/20">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('invoicePrint.subtotalHT')}</span>
                <span className="font-semibold">{formatPrice(quote.totals?.subtotalHT)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {t('invoicePrint.tax')} ({tvaRatePercent}%)
                </span>
                <span className="font-semibold">{formatPrice(quote.totals?.tvaAmount)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="font-bold text-sm">{t('invoicePrint.totalTTC')}</span>
                <span className="font-bold text-primary text-base">
                  {formatPrice(quote.totals?.totalTTC)}
                </span>
              </div>
            </div>
          </div>

          {quote.notes && (
            <div className="rounded-lg bg-amber-50 border-l-4 border-amber-400 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800 mb-0.5">
                {t('invoicePrint.notes')}
              </p>
              <p className="text-xs text-amber-900 whitespace-pre-wrap">{quote.notes}</p>
            </div>
          )}
        </div>

        <div className="bg-muted/30 border-t px-6 md:px-10 py-4 text-xs text-slate-600">
          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-0.5">
              {quote.supplierInfo?.address && <p>{quote.supplierInfo.address}</p>}
              {quote.supplierInfo?.city && <p>{quote.supplierInfo.city}</p>}
              {(quote.supplierInfo?.phone || quote.supplierInfo?.email) && (
                <p>
                  {quote.supplierInfo?.phone}
                  {quote.supplierInfo?.phone && quote.supplierInfo?.email && (
                    <span className="mx-1">·</span>
                  )}
                  {quote.supplierInfo?.email}
                </p>
              )}
              {quote.supplierInfo?.website && <p>{quote.supplierInfo.website}</p>}
            </div>
            <div className="space-y-0.5 md:text-right">
              {quote.supplierInfo?.taxId && (
                <p>
                  {t('invoicePrint.taxId')}:{' '}
                  <span className="font-medium text-slate-700">{quote.supplierInfo.taxId}</span>
                </p>
              )}
            </div>
          </div>
          <p className="text-center text-[11px] text-slate-500 mt-3 pt-3 border-t border-slate-200/60">
            {t('quotePrint.thanks')} · {t('invoicePrint.autoGenerated')}
          </p>
        </div>
      </div>
    </div>
  );
}
