'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { KeyValueLineEditor } from '@/components/forms/key-value-line-editor';
import { createEmptyKeyValueLine, parseKeyValueLines, serializeKeyValueLines, type KeyValueLine } from '@/lib/key-value-lines';
import { useI18n } from '@/components/providers/locale-provider';

interface Promotion {
  _id: string;
  title: string;
  description?: string;
  composition: string;
  dosage: string;
  discountType: 'PERCENT' | 'FIXED';
  discountValue: number;
  scope: { type: string; productIds: string[]; categoryIds: string[] };
  startDate: string;
  endDate: string;
  isActive: boolean;
  stats: { views: number; ordersGenerated: number };
  createdAt: string;
}

interface HeroPromotionRequest {
  _id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  linkUrl: string;
  ctaLabel: string;
  kind: 'PRODUCT' | 'EVENT';
  composition: string;
  dosage: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  adminNote?: string;
  createdAt: string;
}

export default function DashboardPromotionsPage() {
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [showHeroRequestForm, setShowHeroRequestForm] = useState(false);

  const { data: meData, isLoading: isMeLoading } = useQuery({
    queryKey: ['auth-me'],
    queryFn: async () => {
      const res = await fetch('/api/auth/me');
      if (!res.ok) return null;
      return res.json();
    },
    retry: false,
  });

  const isSupplier = meData?.user?.role === 'SUPPLIER';
  const canSubmitHeroRequest = isSupplier && !isMeLoading;

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [compositionLines, setCompositionLines] = useState<KeyValueLine[]>([createEmptyKeyValueLine()]);
  const [dosageLines, setDosageLines] = useState<KeyValueLine[]>([createEmptyKeyValueLine()]);
  const [discountType, setDiscountType] = useState<'PERCENT' | 'FIXED'>('PERCENT');
  const [discountValue, setDiscountValue] = useState('');
  const [scopeType, setScopeType] = useState('ALL_PRODUCTS');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [heroTitle, setHeroTitle] = useState('');
  const [heroDescription, setHeroDescription] = useState('');
  const [heroImageUrl, setHeroImageUrl] = useState('');
  const [heroLinkUrl, setHeroLinkUrl] = useState('');
  const [heroCtaLabel, setHeroCtaLabel] = useState(t('dashboardPromotions.typeProduct'));
  const [heroKind, setHeroKind] = useState<'PRODUCT' | 'EVENT'>('PRODUCT');
  const [heroCompositionLines, setHeroCompositionLines] = useState<KeyValueLine[]>([createEmptyKeyValueLine()]);
  const [heroDosageLines, setHeroDosageLines] = useState<KeyValueLine[]>([createEmptyKeyValueLine()]);
  const [heroStartDate, setHeroStartDate] = useState('');
  const [heroEndDate, setHeroEndDate] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-promotions'],
    enabled: isSupplier,
    queryFn: async () => {
      const res = await fetch('/api/dashboard/promotions');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const promotions: Promotion[] = data?.promotions || [];
  const counts = data?.counts || { active: 0, upcoming: 0, expired: 0 };
  const dateLocale = locale === 'ar' ? 'ar-TN' : locale === 'en' ? 'en-GB' : 'fr-FR';

  const { data: heroRequestData } = useQuery({
    queryKey: ['dashboard-hero-promotion-requests'],
    enabled: isSupplier,
    queryFn: async () => {
      const res = await fetch('/api/dashboard/hero-promotion-requests');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const heroRequests: HeroPromotionRequest[] = heroRequestData?.requests || [];

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/dashboard/promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const r = await res.json();
        throw new Error(r.error || 'Error');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-promotions'] });
      toast({ title: t('dashboardPromotions.promotionCreated') });
      resetForm();
    },
    onError: (e: Error) => {
      toast({ title: e.message });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await fetch(`/api/dashboard/promotions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-promotions'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/dashboard/promotions/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-promotions'] });
      toast({ title: t('dashboardPromotions.promoDeleted') });
    },
  });

  const createHeroRequestMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (!canSubmitHeroRequest) {
        throw new Error(t('dashboardPromotions.supplierRequired'));
      }
      const res = await fetch('/api/dashboard/hero-promotion-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const r = await res.json();
        throw new Error(r.error || 'Error');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-hero-promotion-requests'] });
      toast({ title: t('dashboardPromotions.requestSent') });
      setHeroTitle('');
      setHeroDescription('');
      setHeroImageUrl('');
      setHeroLinkUrl('');
      setHeroCtaLabel(t('dashboardPromotions.typeProduct'));
      setHeroKind('PRODUCT');
      setHeroCompositionLines([createEmptyKeyValueLine()]);
      setHeroDosageLines([createEmptyKeyValueLine()]);
      setHeroStartDate('');
      setHeroEndDate('');
      setShowHeroRequestForm(false);
    },
    onError: (e: Error) => {
      toast({ title: e.message });
    },
  });

  function resetForm() {
    setShowForm(false);
    setTitle('');
    setDescription('');
    setCompositionLines([createEmptyKeyValueLine()]);
    setDosageLines([createEmptyKeyValueLine()]);
    setDiscountType('PERCENT');
    setDiscountValue('');
    setScopeType('ALL_PRODUCTS');
    setStartDate('');
    setEndDate('');
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    createMutation.mutate({
      title,
      description,
      composition: serializeKeyValueLines(compositionLines),
      dosage: serializeKeyValueLines(dosageLines),
      discountType,
      discountValue: parseFloat(discountValue),
      scope: { type: scopeType, productIds: [], categoryIds: [] },
      startDate,
      endDate,
    });
  }

  function handleCreateHeroRequest(e: React.FormEvent) {
    e.preventDefault();
    createHeroRequestMutation.mutate({
      title: heroTitle,
      description: heroDescription,
      imageUrl: heroImageUrl,
      linkUrl: heroLinkUrl,
      ctaLabel: heroCtaLabel,
      kind: heroKind,
      composition: serializeKeyValueLines(heroCompositionLines),
      dosage: serializeKeyValueLines(heroDosageLines),
      startDate: heroStartDate,
      endDate: heroEndDate,
    });
  }

  function renderKeyValueText(value: string) {
    const lines = parseKeyValueLines(value);

    if (lines.length === 0) {
      return t('dashboardInvoices.notAvailable');
    }

    return (
      <span className="inline-flex flex-col gap-0.5 align-top">
        {lines.map((line, index) => (
          <span key={`${line.title}-${index}`}>
            {line.title ? <span className="font-medium">{line.title}:</span> : null} {line.value || t('dashboardInvoices.notAvailable')}
          </span>
        ))}
      </span>
    );
  }

  function getStatus(p: Promotion) {
    const now = new Date();
    const start = new Date(p.startDate);
    const end = new Date(p.endDate);
    if (!p.isActive) return { label: t('dashboardPromotions.disabled'), color: 'bg-gray-100 text-gray-700' };
    if (end < now) return { label: t('dashboardPromotions.finishedStatus'), color: 'bg-gray-100 text-gray-700' };
    if (start > now) return { label: t('dashboardPromotions.upcomingStatus'), color: 'bg-blue-100 text-blue-700' };
    return { label: t('dashboardPromotions.activeStatus'), color: 'bg-green-100 text-green-700' };
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('dashboardPromotions.heading')}</h1>
          <p className="text-muted-foreground">{t('dashboardPromotions.subtitle')}</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? t('dashboardPromotions.cancel') : t('dashboardPromotions.newPromotion')}
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{t('dashboardPromotions.active')}</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-green-600">{counts.active}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{t('dashboardPromotions.upcoming')}</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-emerald-600">{counts.upcoming}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{t('dashboardPromotions.finished')}</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-gray-600">{counts.expired}</p></CardContent>
        </Card>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>{t('dashboardPromotions.newPromotionTitle')}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('dashboardPromotions.title')}</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} required className="mt-1" />
                </div>
                <div>
                  <Label>{t('dashboardPromotions.descriptionOptional')}</Label>
                  <Input value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <KeyValueLineEditor
                    label={t('dashboardPromotions.compositionRequired')}
                    description={t('dashboardPromotions.compositionDesc')}
                    entries={compositionLines}
                    onChange={setCompositionLines}
                    titlePlaceholder={t('dashboardPromotions.titlePlaceholder')}
                    valuePlaceholder={t('dashboardPromotions.valuePlaceholder')}
                    addLabel={t('dashboardPromotions.addCompositionLine')}
                  />
                </div>
                <div className="space-y-2">
                  <KeyValueLineEditor
                    label={t('dashboardPromotions.dosageRequired')}
                    description={t('dashboardPromotions.dosageDesc')}
                    entries={dosageLines}
                    onChange={setDosageLines}
                    titlePlaceholder={t('dashboardPromotions.dosageTitlePlaceholder')}
                    valuePlaceholder={t('dashboardPromotions.dosageValuePlaceholder')}
                    addLabel={t('dashboardPromotions.addDosageLine')}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>{t('dashboardPromotions.discountType')}</Label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1" value={discountType} onChange={(e) => setDiscountType(e.target.value as any)}>
                    <option value="PERCENT">{locale === 'fr' ? 'Pourcentage (%)' : locale === 'ar' ? 'نسبة مئوية (%)' : 'Percentage (%)'}</option>
                    <option value="FIXED">{locale === 'fr' ? 'Montant fixe (DT)' : locale === 'ar' ? 'مبلغ ثابت (DT)' : 'Fixed amount (DT)'}</option>
                  </select>
                </div>
                <div>
                  <Label>{t('dashboardPromotions.discountValue')}</Label>
                  <Input type="number" min="0" max={discountType === 'PERCENT' ? '100' : undefined} step="0.01" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} required className="mt-1" />
                </div>
                <div>
                  <Label>{t('dashboardPromotions.scope')}</Label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1" value={scopeType} onChange={(e) => setScopeType(e.target.value)}>
                    <option value="ALL_PRODUCTS">{t('dashboardPromotions.scopeAllProducts')}</option>
                    <option value="SPECIFIC_PRODUCTS">{t('dashboardPromotions.scopeSpecificProducts')}</option>
                    <option value="CATEGORY">{t('dashboardPromotions.scopeCategory')}</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('dashboardPromotions.startDate')}</Label>
                  <Input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} required className="mt-1" />
                </div>
                <div>
                  <Label>{t('dashboardPromotions.endDate')}</Label>
                  <Input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} required className="mt-1" />
                </div>
              </div>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? t('dashboardPromotions.creating') : t('dashboardPromotions.createPromotion')}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('dashboardPromotions.heroRequestTitle')}</CardTitle>
          <Button variant="outline" onClick={() => setShowHeroRequestForm((v) => !v)}>
            {showHeroRequestForm ? t('dashboardPromotions.cancel') : t('dashboardPromotions.sendRequest')}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {showHeroRequestForm && (
            <form onSubmit={handleCreateHeroRequest} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('dashboardPromotions.title')} *</Label>
                  <Input value={heroTitle} onChange={(e) => setHeroTitle(e.target.value)} required className="mt-1" />
                </div>
                <div>
                  <Label>{t('dashboardPromotions.buttonText')}</Label>
                  <Input value={heroCtaLabel} onChange={(e) => setHeroCtaLabel(e.target.value)} className="mt-1" />
                </div>
              </div>
              <div>
                <Label>{t('dashboardPromotions.promotionType')}</Label>
                <select
                  className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={heroKind}
                  onChange={(e) => setHeroKind(e.target.value as 'PRODUCT' | 'EVENT')}
                >
                  <option value="PRODUCT">{t('dashboardPromotions.typeProduct')}</option>
                  <option value="EVENT">{t('dashboardPromotions.typeEvent')}</option>
                </select>
              </div>
              <div>
                <Label>{t('dashboardPromotions.descriptionOptional')}</Label>
                <Input value={heroDescription} onChange={(e) => setHeroDescription(e.target.value)} className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('dashboardPromotions.imageUrl')}</Label>
                  <Input value={heroImageUrl} onChange={(e) => setHeroImageUrl(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label>{t('dashboardPromotions.targetLink')}</Label>
                  <Input value={heroLinkUrl} onChange={(e) => setHeroLinkUrl(e.target.value)} required className="mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <KeyValueLineEditor
                    label={heroKind === 'PRODUCT' ? t('dashboardPromotions.compositionRequired') : t('dashboardPromotions.compositionOptional')}
                    entries={heroCompositionLines}
                    onChange={setHeroCompositionLines}
                    titlePlaceholder={t('dashboardPromotions.titlePlaceholder')}
                    valuePlaceholder={t('dashboardPromotions.valuePlaceholder')}
                    addLabel={t('dashboardPromotions.addCompositionLine')}
                  />
                </div>
                <div className="space-y-2">
                  <KeyValueLineEditor
                    label={heroKind === 'PRODUCT' ? t('dashboardPromotions.dosageRequired') : t('dashboardPromotions.dosageOptional')}
                    entries={heroDosageLines}
                    onChange={setHeroDosageLines}
                    titlePlaceholder={t('dashboardPromotions.dosageTitlePlaceholder')}
                    valuePlaceholder={t('dashboardPromotions.dosageValuePlaceholder')}
                    addLabel={t('dashboardPromotions.addDosageLine')}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('dashboardPromotions.startDate')}</Label>
                  <Input type="datetime-local" value={heroStartDate} onChange={(e) => setHeroStartDate(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label>{t('dashboardPromotions.endDate')}</Label>
                  <Input type="datetime-local" value={heroEndDate} onChange={(e) => setHeroEndDate(e.target.value)} className="mt-1" />
                </div>
              </div>
              <Button type="submit" disabled={createHeroRequestMutation.isPending || !canSubmitHeroRequest}>
                {createHeroRequestMutation.isPending ? t('dashboardPromotions.sending') : t('dashboardPromotions.sendToAdmin')}
              </Button>
            </form>
          )}

          <div className="space-y-2">
            {heroRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('dashboardPromotions.noRequestSent')}</p>
            ) : (
              heroRequests.map((request) => (
                <div key={request._id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{request.title}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${request.status === 'PENDING' ? 'bg-amber-100 text-amber-700' : request.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {request.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{t('dashboardPromotions.type')}: {request.kind === 'PRODUCT' ? t('dashboardPromotions.typeProduct') : t('dashboardPromotions.typeEvent')}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t('dashboardPromotions.composition')}: {renderKeyValueText(request.composition)}</p>
                  <p className="text-xs text-muted-foreground">{t('dashboardPromotions.dosage')}: {renderKeyValueText(request.dosage)}</p>
                  {request.adminNote ? <p className="text-xs text-muted-foreground">{t('dashboardPromotions.adminNote')}: {request.adminNote}</p> : null}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : promotions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-4xl mb-4">🏷️</p>
            <p className="text-lg font-medium mb-2">{t('dashboardPromotions.noPromotion')}</p>
            <p className="text-muted-foreground mb-4">
              {t('dashboardPromotions.firstPromoHint')}
            </p>
            <Button onClick={() => setShowForm(true)}>{t('dashboardPromotions.createAPromotion')}</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {promotions.map((p) => {
            const status = getStatus(p);
            return (
              <Card key={p._id}>
                <CardContent className="flex items-center justify-between py-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <p className="font-medium">{p.title}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.color}`}>
                        {status.label}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(p.startDate).toLocaleDateString(dateLocale)} — {new Date(p.endDate).toLocaleDateString(dateLocale)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium">{t('dashboardPromotions.composition')}:</span> {renderKeyValueText(p.composition)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium">{t('dashboardPromotions.dosage')}:</span> {renderKeyValueText(p.dosage)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {p.stats.views} {t('dashboardPromotions.views')} · {p.stats.ordersGenerated} {t('dashboardPromotions.generatedOrders')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleMutation.mutate({ id: p._id, isActive: !p.isActive })}
                    >
                      {p.isActive ? t('dashboardPromotions.deactivate') : t('dashboardPromotions.activate')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600"
                      onClick={() => {
                        if (confirm(t('dashboardPromotions.deleteConfirm'))) {
                          deleteMutation.mutate(p._id);
                        }
                      }}
                    >
                      {t('dashboardPromotions.delete')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
