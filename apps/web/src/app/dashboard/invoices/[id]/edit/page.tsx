'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import InvoiceForm, {
  defaultInvoiceValues,
  type InvoiceFormValues,
  type InvoiceFormLineItem,
} from '../../_components/InvoiceForm';
import { useI18n } from '@/components/providers/locale-provider';

const ALLOWED_ROLES = new Set(['SUPPLIER', 'SUPPLIER_PRIME', 'SUPER_SUPPLIER', 'ADMIN']);

function toDateInput(v: unknown): string {
  if (!v) return '';
  const d = new Date(v as string);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function toFormValues(inv: any): InvoiceFormValues {
  const defaults = defaultInvoiceValues();
  const lineItems: InvoiceFormLineItem[] = Array.isArray(inv?.lineItems)
    ? inv.lineItems.map((li: any) => ({
        description: String(li?.description ?? ''),
        qty: String(li?.qty ?? li?.quantity ?? 0),
        unitPrice: String(li?.unitPrice ?? 0),
      }))
    : [];

  return {
    status: inv?.status || defaults.status,
    paymentMethod: inv?.paymentMethod || '',
    issuedAt: toDateInput(inv?.issuedAt) || defaults.issuedAt,
    dueAt: toDateInput(inv?.dueAt) || defaults.dueAt,
    tvaRate: String(inv?.totals?.tvaRate ?? defaults.tvaRate),
    currency: inv?.totals?.currency || defaults.currency,
    notes: inv?.notes || '',
    buyerInfo: {
      name: inv?.buyerInfo?.name || '',
      address: inv?.buyerInfo?.address || '',
      city: inv?.buyerInfo?.city || '',
      taxId: inv?.buyerInfo?.taxId || '',
      phone: inv?.buyerInfo?.phone || '',
      email: inv?.buyerInfo?.email || '',
    },
    supplierInfo: {
      name: inv?.supplierInfo?.name || '',
      address: inv?.supplierInfo?.address || '',
      city: inv?.supplierInfo?.city || '',
      taxId: inv?.supplierInfo?.taxId || '',
      phone: inv?.supplierInfo?.phone || '',
      email: inv?.supplierInfo?.email || '',
      logo: inv?.supplierInfo?.logo || '',
      website: inv?.supplierInfo?.website || '',
    },
    lineItems: lineItems.length > 0 ? lineItems : defaults.lineItems,
  };
}

export default function EditInvoicePage() {
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
      if (!role || !ALLOWED_ROLES.has(role)) {
        router.replace('/dashboard/invoices');
      }
    }
  }, [meQuery.isSuccess, meQuery.data, router]);

  const invoiceQuery = useQuery({
    queryKey: ['invoice-edit', id],
    enabled: !!id,
    queryFn: async () => {
      const res = await fetch(`/api/invoices/${id}`);
      if (!res.ok) throw new Error('Not found');
      return res.json();
    },
  });

  if (meQuery.isLoading || invoiceQuery.isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  if (invoiceQuery.isError || !invoiceQuery.data?.invoice) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        {t('invoicePrint.notFound')}
      </div>
    );
  }

  const invoice = invoiceQuery.data.invoice;
  const values = toFormValues(invoice);
  const locked = invoice.status !== 'DRAFT';

  return (
    <InvoiceForm
      mode="edit"
      invoiceId={id}
      invoiceNumber={invoice.invoiceNumber}
      initialValues={values}
      lineItemsLocked={locked}
      lineItemsLockedReason={locked ? t('invoiceForm.lineItemsLockedNote') : undefined}
      onSaved={(savedId) => router.push(`/invoice/${savedId}`)}
    />
  );
}
