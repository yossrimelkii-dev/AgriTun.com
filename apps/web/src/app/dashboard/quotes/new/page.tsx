'use client';

import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import QuoteForm, { defaultQuoteValues, type QuoteFormValues } from '../_components/QuoteForm';

const ALLOWED_ROLES = new Set(['SUPPLIER', 'SUPPLIER_PRIME', 'SUPER_SUPPLIER', 'ADMIN']);

export default function NewQuotePage() {
  const router = useRouter();

  const meQuery = useQuery({
    queryKey: ['auth-me'],
    queryFn: async () => {
      const res = await fetch('/api/auth/me');
      if (!res.ok) return { user: null };
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const supplierQuery = useQuery({
    queryKey: ['supplier-me'],
    enabled: !!meQuery.data?.user?.supplierId,
    queryFn: async () => {
      const res = await fetch('/api/supplier/me');
      if (!res.ok) return { supplier: null };
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

  const initialValues: QuoteFormValues = useMemo(() => {
    const base = defaultQuoteValues();
    const s = supplierQuery.data?.supplier;
    if (!s) return base;
    return {
      ...base,
      supplierInfo: {
        ...base.supplierInfo,
        name: s.companyName || '',
        address: s.address || '',
        city: s.city || '',
        taxId: s.taxId || '',
        phone: s.phone || '',
        email: s.email || '',
        logo: s.logo || '',
        website: s.website || '',
      },
    };
  }, [supplierQuery.data]);

  const loading = meQuery.isLoading || (supplierQuery.isFetching && !supplierQuery.data);
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  return (
    <QuoteForm
      key={supplierQuery.data?.supplier?.id || 'no-supplier'}
      mode="create"
      initialValues={initialValues}
      onSaved={(id) => router.push(`/quote/${id}`)}
    />
  );
}
