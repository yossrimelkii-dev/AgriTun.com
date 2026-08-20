'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/components/providers/locale-provider';

export type QuoteFormMode = 'create' | 'edit';

export interface QuoteFormLineItem {
  description: string;
  qty: string;
  unitPrice: string;
}

export interface QuoteFormValues {
  status: string;
  issuedAt: string;
  validUntil: string;
  tvaRate: string;
  currency: string;
  notes: string;
  buyerInfo: {
    name: string;
    address: string;
    city: string;
    taxId: string;
    phone: string;
    email: string;
  };
  supplierInfo: {
    name: string;
    address: string;
    city: string;
    taxId: string;
    phone: string;
    email: string;
    logo: string;
    website: string;
  };
  lineItems: QuoteFormLineItem[];
}

export function emptyQuoteLineItem(): QuoteFormLineItem {
  return { description: '', qty: '1', unitPrice: '' };
}

export function defaultQuoteValues(): QuoteFormValues {
  const now = new Date();
  const valid = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return {
    status: 'DRAFT',
    issuedAt: iso(now),
    validUntil: iso(valid),
    tvaRate: '19',
    currency: 'TND',
    notes: '',
    buyerInfo: { name: '', address: '', city: '', taxId: '', phone: '', email: '' },
    supplierInfo: { name: '', address: '', city: '', taxId: '', phone: '', email: '', logo: '', website: '' },
    lineItems: [emptyQuoteLineItem()],
  };
}

const STATUSES = ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED'] as const;

interface Props {
  mode: QuoteFormMode;
  initialValues: QuoteFormValues;
  quoteId?: string;
  quoteNumber?: string;
  lineItemsLocked?: boolean;
  lineItemsLockedReason?: string;
  onSaved?: (quoteId: string) => void;
}

export default function QuoteForm({
  mode,
  initialValues,
  quoteId,
  quoteNumber,
  lineItemsLocked = false,
  lineItemsLockedReason,
  onSaved,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const { t, locale } = useI18n();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [values, setValues] = useState<QuoteFormValues>(initialValues);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [refreshingSupplier, setRefreshingSupplier] = useState(false);
  const [error, setError] = useState('');

  const numberLocale = locale === 'ar' ? 'ar-TN' : locale === 'en' ? 'en-US' : 'fr-TN';

  const totals = useMemo(() => {
    const subtotalHT = values.lineItems.reduce((sum, li) => {
      return sum + (parseFloat(li.qty) || 0) * (parseFloat(li.unitPrice) || 0);
    }, 0);
    const rate = Math.max(0, Math.min(100, parseFloat(values.tvaRate) || 0));
    const tva = subtotalHT * (rate / 100);
    return {
      subtotalHT: Math.round(subtotalHT * 100) / 100,
      tvaAmount: Math.round(tva * 100) / 100,
      totalTTC: Math.round((subtotalHT + tva) * 100) / 100,
    };
  }, [values.lineItems, values.tvaRate]);

  const formatPrice = (n: number) =>
    new Intl.NumberFormat(numberLocale, {
      style: 'currency',
      currency: values.currency || 'TND',
      maximumFractionDigits: 2,
    }).format(n);

  function updateBuyer<K extends keyof QuoteFormValues['buyerInfo']>(k: K, v: string) {
    setValues((p) => ({ ...p, buyerInfo: { ...p.buyerInfo, [k]: v } }));
  }
  function updateSupplier<K extends keyof QuoteFormValues['supplierInfo']>(k: K, v: string) {
    setValues((p) => ({ ...p, supplierInfo: { ...p.supplierInfo, [k]: v } }));
  }
  function updateLineItem(i: number, k: keyof QuoteFormLineItem, v: string) {
    setValues((p) => {
      const next = [...p.lineItems];
      next[i] = { ...next[i], [k]: v };
      return { ...p, lineItems: next };
    });
  }
  function addLineItem() {
    setValues((p) => ({ ...p, lineItems: [...p.lineItems, emptyQuoteLineItem()] }));
  }
  function removeLineItem(i: number) {
    setValues((p) => ({
      ...p,
      lineItems: p.lineItems.length > 1 ? p.lineItems.filter((_, ix) => ix !== i) : p.lineItems,
    }));
  }

  async function pullSupplierProfile() {
    setRefreshingSupplier(true);
    try {
      const res = await fetch('/api/supplier/me');
      const json = await res.json();
      const s = json?.supplier;
      if (!s) return toast({ title: t('invoiceForm.supplierProfileMissing') });
      setValues((prev) => ({
        ...prev,
        supplierInfo: {
          ...prev.supplierInfo,
          name: s.companyName || prev.supplierInfo.name,
          logo: s.logo || prev.supplierInfo.logo,
          address: s.address || prev.supplierInfo.address,
          city: s.city || prev.supplierInfo.city,
          taxId: s.taxId || prev.supplierInfo.taxId,
          phone: s.phone || prev.supplierInfo.phone,
          email: s.email || prev.supplierInfo.email,
          website: s.website || prev.supplierInfo.website,
        },
      }));
      toast({ title: t('invoiceForm.supplierProfileLoaded') });
    } catch {
      toast({ title: t('invoiceForm.supplierProfileFailed') });
    } finally {
      setRefreshingSupplier(false);
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/uploads/invoice-logo', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Upload failed');
      updateSupplier('logo', json.url);
      toast({ title: t('invoiceForm.logoUploaded') });
    } catch (err: any) {
      toast({ title: t('invoiceForm.logoUploadFailed'), description: err?.message });
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!values.buyerInfo.name.trim()) {
      setError(t('invoiceForm.errorBuyerName'));
      return;
    }
    const validItems = values.lineItems.filter(
      (li) => li.description.trim() && parseFloat(li.qty) > 0
    );
    if (!lineItemsLocked && validItems.length === 0) {
      setError(t('invoiceForm.errorLineItems'));
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, any> = {
        status: values.status,
        buyerInfo: values.buyerInfo,
        supplierInfo: values.supplierInfo,
        validUntil: values.validUntil,
        notes: values.notes,
        tvaRate: parseFloat(values.tvaRate) || 0,
        currency: values.currency,
      };

      if (mode === 'create') {
        payload.issuedAt = values.issuedAt;
        payload.lineItems = validItems.map((li) => ({
          description: li.description,
          qty: parseFloat(li.qty),
          unitPrice: parseFloat(li.unitPrice) || 0,
        }));
      } else if (!lineItemsLocked) {
        payload.lineItems = validItems.map((li) => ({
          description: li.description,
          qty: parseFloat(li.qty),
          unitPrice: parseFloat(li.unitPrice) || 0,
        }));
      }

      const url = mode === 'create' ? '/api/quotes' : `/api/quotes/${quoteId}`;
      const method = mode === 'create' ? 'POST' : 'PATCH';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Request failed');

      toast({
        title: mode === 'create' ? t('quoteForm.createdToast') : t('quoteForm.updatedToast'),
      });

      const savedId = json?.quote?._id || quoteId;
      if (onSaved && savedId) onSaved(savedId);
      else if (savedId) router.push(`/quote/${savedId}`);
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">
            {mode === 'create' ? t('quoteForm.createHeading') : t('quoteForm.editHeading')}
          </h1>
          {quoteNumber && (
            <p className="text-muted-foreground">
              {t('quoteForm.quoteNumberLabel')}: {quoteNumber}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            {t('invoiceForm.cancel')}
          </Button>
          <Button type="submit" disabled={saving || uploadingLogo}>
            {saving ? t('invoiceForm.saving') : t('invoiceForm.save')}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('invoiceForm.metaSection')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div>
            <Label htmlFor="status">{t('invoiceForm.status')}</Label>
            <select
              id="status"
              value={values.status}
              onChange={(e) => setValues((p) => ({ ...p, status: e.target.value }))}
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`quoteForm.status_${s}`)}
                </option>
              ))}
            </select>
          </div>
          {mode === 'create' && (
            <div>
              <Label htmlFor="issuedAt">{t('invoiceForm.issuedAt')}</Label>
              <Input
                id="issuedAt"
                type="date"
                value={values.issuedAt}
                onChange={(e) => setValues((p) => ({ ...p, issuedAt: e.target.value }))}
              />
            </div>
          )}
          <div>
            <Label htmlFor="validUntil">{t('quoteForm.validUntil')}</Label>
            <Input
              id="validUntil"
              type="date"
              value={values.validUntil}
              onChange={(e) => setValues((p) => ({ ...p, validUntil: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="tvaRate">{t('invoiceForm.tvaRate')} (%)</Label>
            <Input
              id="tvaRate"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={values.tvaRate}
              onChange={(e) => setValues((p) => ({ ...p, tvaRate: e.target.value }))}
              disabled={lineItemsLocked}
            />
          </div>
          <div>
            <Label htmlFor="currency">{t('invoiceForm.currency')}</Label>
            <Input
              id="currency"
              value={values.currency}
              onChange={(e) => setValues((p) => ({ ...p, currency: e.target.value.toUpperCase() }))}
              maxLength={8}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 gap-2 flex-wrap">
          <CardTitle>{t('invoiceForm.supplierSection')}</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={pullSupplierProfile}
            disabled={refreshingSupplier}
          >
            {refreshingSupplier ? t('invoiceForm.refreshing') : t('invoiceForm.useMyProfile')}
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2 flex items-start gap-4">
            <div className="w-24 h-24 rounded-md border bg-muted/30 flex items-center justify-center overflow-hidden shrink-0">
              {values.supplierInfo.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={values.supplierInfo.logo}
                  alt="logo"
                  className="w-full h-full object-contain"
                />
              ) : (
                <span className="text-xs text-muted-foreground">{t('invoiceForm.noLogo')}</span>
              )}
            </div>
            <div className="flex-1 space-y-2">
              <Label>{t('invoiceForm.logo')}</Label>
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="text-sm"
                />
                {values.supplierInfo.logo && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => updateSupplier('logo', '')}
                  >
                    {t('invoiceForm.removeLogo')}
                  </Button>
                )}
              </div>
              {uploadingLogo && (
                <p className="text-xs text-muted-foreground">{t('invoiceForm.uploading')}</p>
              )}
              <Input
                placeholder={t('invoiceForm.logoUrlPlaceholder')}
                value={values.supplierInfo.logo}
                onChange={(e) => updateSupplier('logo', e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="s-name">{t('invoiceForm.name')}</Label>
            <Input id="s-name" value={values.supplierInfo.name} onChange={(e) => updateSupplier('name', e.target.value)} />
          </div>
          <div>
            <Label htmlFor="s-taxId">{t('invoiceForm.taxId')}</Label>
            <Input id="s-taxId" value={values.supplierInfo.taxId} onChange={(e) => updateSupplier('taxId', e.target.value)} />
          </div>
          <div>
            <Label htmlFor="s-address">{t('invoiceForm.address')}</Label>
            <Input id="s-address" value={values.supplierInfo.address} onChange={(e) => updateSupplier('address', e.target.value)} />
          </div>
          <div>
            <Label htmlFor="s-city">{t('invoiceForm.city')}</Label>
            <Input id="s-city" value={values.supplierInfo.city} onChange={(e) => updateSupplier('city', e.target.value)} />
          </div>
          <div>
            <Label htmlFor="s-phone">{t('invoiceForm.phone')}</Label>
            <Input id="s-phone" value={values.supplierInfo.phone} onChange={(e) => updateSupplier('phone', e.target.value)} />
          </div>
          <div>
            <Label htmlFor="s-email">{t('invoiceForm.email')}</Label>
            <Input id="s-email" type="email" value={values.supplierInfo.email} onChange={(e) => updateSupplier('email', e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="s-website">{t('invoiceForm.website')}</Label>
            <Input id="s-website" value={values.supplierInfo.website} onChange={(e) => updateSupplier('website', e.target.value)} placeholder="https://..." />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('invoiceForm.buyerSection')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="b-name">
              {t('invoiceForm.name')} <span className="text-destructive">*</span>
            </Label>
            <Input id="b-name" required value={values.buyerInfo.name} onChange={(e) => updateBuyer('name', e.target.value)} />
          </div>
          <div>
            <Label htmlFor="b-taxId">{t('invoiceForm.taxId')}</Label>
            <Input id="b-taxId" value={values.buyerInfo.taxId} onChange={(e) => updateBuyer('taxId', e.target.value)} />
          </div>
          <div>
            <Label htmlFor="b-address">{t('invoiceForm.address')}</Label>
            <Input id="b-address" value={values.buyerInfo.address} onChange={(e) => updateBuyer('address', e.target.value)} />
          </div>
          <div>
            <Label htmlFor="b-city">{t('invoiceForm.city')}</Label>
            <Input id="b-city" value={values.buyerInfo.city} onChange={(e) => updateBuyer('city', e.target.value)} />
          </div>
          <div>
            <Label htmlFor="b-phone">{t('invoiceForm.phone')}</Label>
            <Input id="b-phone" value={values.buyerInfo.phone} onChange={(e) => updateBuyer('phone', e.target.value)} />
          </div>
          <div>
            <Label htmlFor="b-email">{t('invoiceForm.email')}</Label>
            <Input id="b-email" type="email" value={values.buyerInfo.email} onChange={(e) => updateBuyer('email', e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('invoiceForm.lineItemsSection')}</CardTitle>
          {lineItemsLocked && lineItemsLockedReason && (
            <p className="text-sm text-amber-600">{lineItemsLockedReason}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {values.lineItems.map((item, idx) => (
            <div
              key={idx}
              className="grid gap-3 md:grid-cols-[1fr_100px_140px_140px_auto] items-end border-b pb-4 last:border-b-0"
            >
              <div>
                <Label htmlFor={`li-desc-${idx}`}>{t('invoiceForm.description')}</Label>
                <Input id={`li-desc-${idx}`} value={item.description} onChange={(e) => updateLineItem(idx, 'description', e.target.value)} disabled={lineItemsLocked} />
              </div>
              <div>
                <Label htmlFor={`li-qty-${idx}`}>{t('invoiceForm.quantity')}</Label>
                <Input id={`li-qty-${idx}`} type="number" min="0" step="1" value={item.qty} onChange={(e) => updateLineItem(idx, 'qty', e.target.value)} disabled={lineItemsLocked} />
              </div>
              <div>
                <Label htmlFor={`li-price-${idx}`}>{t('invoiceForm.unitPrice')}</Label>
                <Input id={`li-price-${idx}`} type="number" min="0" step="0.01" value={item.unitPrice} onChange={(e) => updateLineItem(idx, 'unitPrice', e.target.value)} disabled={lineItemsLocked} />
              </div>
              <div>
                <Label>{t('invoiceForm.subtotal')}</Label>
                <div className="h-10 flex items-center px-3 rounded-md border bg-muted/30 text-sm">
                  {formatPrice((parseFloat(item.qty) || 0) * (parseFloat(item.unitPrice) || 0))}
                </div>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => removeLineItem(idx)} disabled={lineItemsLocked || values.lineItems.length <= 1}>
                {t('invoiceForm.remove')}
              </Button>
            </div>
          ))}

          {!lineItemsLocked && (
            <Button type="button" variant="outline" onClick={addLineItem}>
              + {t('invoiceForm.addLineItem')}
            </Button>
          )}

          <div className="flex justify-end pt-4 border-t">
            <div className="w-full md:w-72 space-y-1 text-sm">
              <div className="flex justify-between">
                <span>{t('invoiceForm.subtotalHT')}:</span>
                <span className="font-semibold">{formatPrice(totals.subtotalHT)}</span>
              </div>
              <div className="flex justify-between">
                <span>{t('invoiceForm.tva')} ({values.tvaRate || 0}%):</span>
                <span className="font-semibold">{formatPrice(totals.tvaAmount)}</span>
              </div>
              <div className="flex justify-between text-base pt-2 border-t">
                <span className="font-bold">{t('invoiceForm.totalTTC')}:</span>
                <span className="font-bold">{formatPrice(totals.totalTTC)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('invoiceForm.notesSection')}</CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            value={values.notes}
            onChange={(e) => setValues((p) => ({ ...p, notes: e.target.value }))}
            rows={4}
            maxLength={2000}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder={t('invoiceForm.notesPlaceholder')}
          />
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          {t('invoiceForm.cancel')}
        </Button>
        <Button type="submit" disabled={saving || uploadingLogo}>
          {saving ? t('invoiceForm.saving') : t('invoiceForm.save')}
        </Button>
      </div>
    </form>
  );
}
