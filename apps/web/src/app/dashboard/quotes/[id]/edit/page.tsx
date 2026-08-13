'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import QuoteForm, {
  defaultQuoteValues,
  type QuoteFormLineItem,
  type QuoteFormValues,
} from '../../_components/QuoteForm';
import { useI18n } from '@/components/providers/locale-provider';

const ALLOWED_ROLES = new Set(['SUPPLIER', 'SUPPLIER_PRIME', 'SUPER_SUPPLIER', 'ADMIN']);

function toDateInput(v: unknown): string {
  if (!v) return '';
  const d = new Date(v as string);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function toFormValues(q: any): QuoteFormValues {
  const defaults = defaultQuoteValues();
  const lineItems: QuoteFormLineItem[] = Array.isArray(q?.lineItems)
    ? q.lineItems.map((li: any) => ({
        description: String(li?.description ?? ''),
        qty: String(li?.qty ?? li?.quantity ?? 0),
        unitPrice: String(li?.unitPrice ?? 0),
      }))
    : [];

  return {
    status: q?.status || defaults.status,
    issuedAt: toDateInput(q?.issuedAt) || defaults.issuedAt,
    validUntil: toDateInput(q?.validUntil) || defaults.validUntil,
    tvaRate: String(q?.totals?.tvaRate ?? defaults.tvaRate),
    currency: q?.totals?.currency || defaults.currency,
    notes: q?.notes || '',
    buyerInfo: {
      name: q?.buyerInfo?.name || '',
      address: q?.buyerInfo?.address || '',
      city: q?.buyerInfo?.city || '',
      taxId: q?.buyerInfo?.taxId || '',
      phone: q?.buyerInfo?.phone || '',
      email: q?.buyerInfo?.email || '',
    },
    supplierInfo: {
      name: q?.supplierInfo?.name || '',
      address: q?.supplierInfo?.address || '',
      city: q?.supplierInfo?.city || '',
      taxId: q?.supplierInfo?.taxId || '',
      phone: q?.supplierInfo?.phone || '',
      email: q?.supplierInfo?.email || '',
      logo: q?.supplierInfo?.logo || '',
      website: q?.supplierInfo?.website || '',
    },
    lineItems: lineItems.length > 0 ? lineItems : defaults.lineItems,
  };
}

export default function EditQuotePage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();

  const meQuery = useQuery({
    queryKey: ['auth-me'],
    queryFn: async () => {
      const res = await fetch('/api/auth/me');
      if (!res.ok) return { user: null };
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (meQuery.isSuccess) {
      const role = meQuery.data?.user?.role;
      if (!role || !ALLOWED_ROLES.has(role)) router.replace('/dashboard/quotes');
    }
  }, [meQuery.isSuccess, meQuery.data, router]);

  const quoteQuery = useQuery({
    queryKey: ['quote-edit', id],
    enabled: !!id,
    queryFn: async () => {
      const res = await fetch(`/api/quotes/${id}`);
      if (!res.ok) throw new Error('Not found');
      return res.json();
    },
  });

  if (meQuery.isLoading || quoteQuery.isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  if (quoteQuery.isError || !quoteQuery.data?.quote) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        {t('quotePrint.notFound')}
      </div>
    );
  }

  const quote = quoteQuery.data.quote;
  const values = toFormValues(quote);
  const locked = quote.status !== 'DRAFT';

  return (
    <QuoteForm
      mode="edit"
      quoteId={id}
      quoteNumber={quote.quoteNumber}
      initialValues={values}
      lineItemsLocked={locked}
      lineItemsLockedReason={locked ? t('quoteForm.lineItemsLockedNote') : undefined}
      onSaved={(savedId) => router.push(`/quote/${savedId}`)}
    />
  );
}
