'use client';

import { useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

const UNITS = ['UNIT', 'KG', 'G', 'L', 'ML', 'BOX', 'PALLET'] as const;

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [initDone, setInitDone] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sector, setSector] = useState('');
  const [priceVisibility, setPriceVisibility] = useState('');
  const [tags, setTags] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>(['']);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [variants, setVariants] = useState<any[]>([]);
  const [attributes, setAttributes] = useState<Array<{ key: string; value: string; unit: string }>>([]);
  const [dosage, setDosage] = useState<Array<{ key: string; value: string; unit: string }>>([]);

  // Category hierarchy state
  const [categoryId, setCategoryId] = useState('');
  const [selectedRootId, setSelectedRootId] = useState('');
  const [selectedSubId, setSelectedSubId] = useState('');
  const [selectedSubSubId, setSelectedSubSubId] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['product-edit', id],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/products/${id}`);
      if (!res.ok) throw new Error('Not found');
      return res.json();
    },
  });

  // Fetch current user session to determine role and hide superGross inputs for regular suppliers
  const { data: meData } = useQuery({
    queryKey: ['auth-me'],
    queryFn: async () => {
      const res = await fetch('/api/auth/me');
      if (!res.ok) return { user: null };
      return res.json();
    },
    retry: false,
    staleTime: 60000,
  });
  const currentRole = meData?.user?.role;

  // Fetch all categories for cascading picker
  const categoriesQuery = useQuery({
    queryKey: ['categories-all', sector],
    queryFn: async () => {
      const params = new URLSearchParams({ all: 'true' });
      if (sector && sector !== 'BOTH') params.set('sector', sector);
      const res = await fetch(`/api/categories?${params}`);
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    enabled: !!sector,
  });
  const allCategories: any[] = categoriesQuery.data?.categories || [];

  // Derive hierarchy levels
  const rootCategories = allCategories.filter((c) => !c.parentId);
  const subCategories = selectedRootId
    ? allCategories.filter((c) => c.parentId?.toString() === selectedRootId)
    : [];
  const subSubCategories = selectedSubId
    ? allCategories.filter((c) => c.parentId?.toString() === selectedSubId)
    : [];

  function handleRootChange(rid: string) {
    setSelectedRootId(rid);
    setSelectedSubId('');
    setSelectedSubSubId('');
    const hasChildren = allCategories.some((c) => c.parentId?.toString() === rid);
    setCategoryId(hasChildren ? '' : rid);
  }

  function handleSubChange(sid: string) {
    setSelectedSubId(sid);
    setSelectedSubSubId('');
    const hasChildren = allCategories.some((c) => c.parentId?.toString() === sid);
    setCategoryId(hasChildren ? '' : sid);
  }

  function handleSubSubChange(ssid: string) {
    setSelectedSubSubId(ssid);
    setCategoryId(ssid);
  }

  const product = data?.product;

  // Sync form when data loads
  if (product && !initDone) {
    setName(product.name || '');
    setDescription(product.description || '');
    setSector(product.sector || 'MEDICAL');
    setPriceVisibility(product.priceVisibility || 'PRIME_ONLY');
    setTags((product.tags || []).join(', '));
    setImageUrls(
      (product.images || []).length > 0
        ? (product.images || []).map((img: any) => img?.url || '').filter(Boolean)
        : ['']
    );
    setVariants(
      (product.variants || []).map((v: any) => ({
        _id: v._id,
        name: v.name || '',
        sku: v.sku || '',
        stockQty: String(v.stockQty ?? 0),
        unit: v.unit || 'UNIT',
        retailPrice: String(v.pricing?.retailPrice ?? ''),
        bulkPrice: String(v.pricing?.bulkPrice ?? ''),
        superGrossPrice: String(v.pricing?.superGrossPrice ?? ''),
        minBulkQty: String(v.pricing?.minBulkQty ?? 1),
        weight: String(v.weight ?? ''),
        barcode: v.barcode || '',
      }))
    );
    setAttributes(
      (product.attributes || []).map((a: any) => ({
        key: a.key || '',
        value: a.value || '',
        unit: a.unit || '',
      }))
    );
    setDosage(
      (product.dosage || []).map((d: any) => ({
        key: d.key || '',
        value: d.value || '',
        unit: d.unit || '',
      }))
    );
    // Initialize category hierarchy from categoryPath
    const catPath: any[] = product.categoryPath || [];
    if (catPath.length >= 1) setSelectedRootId(catPath[0]._id?.toString() || '');
    if (catPath.length >= 2) setSelectedSubId(catPath[1]._id?.toString() || '');
    if (catPath.length >= 3) setSelectedSubSubId(catPath[2]._id?.toString() || '');
    setCategoryId(product.categoryId?.toString() || (catPath.length > 0 ? catPath[catPath.length - 1]._id?.toString() : '') || '');
    setInitDone(true);
  }

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch(`/api/dashboard/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => {
      // Refresh the specific product cache so the UI reflects saved dosage/attributes immediately
      queryClient.invalidateQueries({ queryKey: ['product-edit', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-products'] });
      toast({ title: 'Produit mis à jour ✓' });
      router.push('/dashboard/products');
    },
    onError: () => {
      toast({ title: 'Erreur de sauvegarde' });
    },
  });

  function updateVariant(idx: number, field: string, value: string) {
    setVariants((v) => v.map((variant, i) => (i === idx ? { ...variant, [field]: value } : variant)));
  }

  function addAttribute() {
    setAttributes((a) => [...a, { key: '', value: '', unit: '' }]);
  }

  function removeAttribute(idx: number) {
    setAttributes((a) => a.filter((_, i) => i !== idx));
  }

  function addDosage() {
    setDosage((d) => [...d, { key: '', value: '', unit: '' }]);
  }

  function removeDosage(idx: number) {
    setDosage((d) => d.filter((_, i) => i !== idx));
  }

  function updateImage(idx: number, value: string) {
    setImageUrls((imgs) => imgs.map((img, i) => (i === idx ? value : img)));
  }

  function addImageField() {
    setImageUrls((imgs) => [...imgs, '']);
  }

  function removeImageField(idx: number) {
    setImageUrls((imgs) => {
      if (imgs.length <= 1) return imgs;
      return imgs.filter((_, i) => i !== idx);
    });
  }

  async function handleImageUpload(file: File) {
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/uploads/product-image', {
        method: 'POST',
        body: formData,
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result?.error || 'Échec upload image');
      }

      setImageUrls((imgs) => {
        const hasEmpty = imgs.some((u) => !u.trim());
        if (hasEmpty) {
          const next = [...imgs];
          const idx = next.findIndex((u) => !u.trim());
          next[idx] = result.url;
          return next;
        }
        return [...imgs, result.url];
      });

      toast({ title: 'Image uploadée ✓' });
    } catch (error: any) {
      toast({ title: error?.message || 'Erreur lors de l\'upload image' });
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    saveMutation.mutate({
      name,
      description,
      categoryId,
      sector,
      priceVisibility,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      images: imageUrls
        .map((url) => url.trim())
        .filter(Boolean)
        .map((url, index) => ({
          url,
          alt: name?.trim() || undefined,
          order: index,
        })),
      variants: variants.map((v) => ({
        _id: v._id,
        name: v.name,
        sku: v.sku,
        stockQty: parseInt(v.stockQty) || 0,
        unit: v.unit,
        pricing: {
          retailPrice: parseFloat(v.retailPrice) || 0,
          bulkPrice: v.bulkPrice ? parseFloat(v.bulkPrice) : undefined,
          superGrossPrice: v.superGrossPrice ? parseFloat(v.superGrossPrice) : undefined,
          minBulkQty: parseInt(v.minBulkQty) || 1,
        },
        weight: v.weight ? parseFloat(v.weight) : undefined,
        barcode: v.barcode || undefined,
      })),
      attributes: attributes.filter((a) => a.key && a.value),
      dosage: dosage.filter((d) => d.key && d.value),
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-3xl">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (!product) {
    return <p className="text-muted-foreground py-12 text-center">Produit introuvable</p>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Modifier le Produit</h1>
          <p className="text-muted-foreground text-sm">{product.slug}</p>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
          product.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
          product.status === 'DRAFT' ? 'bg-gray-100 text-gray-700' :
          'bg-yellow-100 text-yellow-700'
        }`}>
          {product.status}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Informations générales</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Nom du produit</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Description</Label>
              <textarea
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={10000}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Secteur</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1" value={sector} onChange={(e) => {
                  setSector(e.target.value);
                  setSelectedRootId('');
                  setSelectedSubId('');
                  setSelectedSubSubId('');
                  setCategoryId('');
                }}>
                  <option value="MEDICAL">🏥 Équipement des animaux</option>
                  <option value="AGRICULTURAL">🌾 Agricole</option>
                  <option value="BOTH">🔄 Les Deux</option>
                </select>
              </div>
              <div>
                <Label>Visibilité prix</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1" value={priceVisibility} onChange={(e) => setPriceVisibility(e.target.value)}>
                  <option value="PUBLIC">Public</option>
                  <option value="PRIME_ONLY">PRIME uniquement</option>
                  <option value="HIDDEN">Caché</option>
                </select>
              </div>
              <div>
                <Label>Tags</Label>
                <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="tag1, tag2" className="mt-1" />
              </div>
            </div>

            {/* Cascading category picker */}
            <div>
              <Label>Catégorie</Label>
              <div className="grid grid-cols-3 gap-3 mt-1">
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={selectedRootId}
                  onChange={(e) => handleRootChange(e.target.value)}
                >
                  <option value="">— Catégorie —</option>
                  {rootCategories.map((cat: any) => (
                    <option key={cat._id} value={cat._id}>{cat.icon ? `${cat.icon} ` : ''}{cat.name}</option>
                  ))}
                </select>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={selectedSubId}
                  onChange={(e) => handleSubChange(e.target.value)}
                  disabled={subCategories.length === 0}
                >
                  <option value="">— Sous-catégorie —</option>
                  {subCategories.map((cat: any) => (
                    <option key={cat._id} value={cat._id}>{cat.icon ? `${cat.icon} ` : ''}{cat.name}</option>
                  ))}
                </select>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={selectedSubSubId}
                  onChange={(e) => handleSubSubChange(e.target.value)}
                  disabled={subSubCategories.length === 0}
                >
                  <option value="">— Sous-sous-catégorie —</option>
                  {subSubCategories.map((cat: any) => (
                    <option key={cat._id} value={cat._id}>{cat.icon ? `${cat.icon} ` : ''}{cat.name}</option>
                  ))}
                </select>
              </div>
              {selectedRootId && !categoryId && (
                <p className="text-xs text-orange-600 mt-1">Veuillez sélectionner la sous-catégorie la plus spécifique</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Images du produit</CardTitle>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={addImageField}>+ Lien image</Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                >
                  {uploadingImage ? 'Upload...' : '📁 Upload PC'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageUpload(file);
              }}
            />
            {imageUrls.map((url, idx) => (
              <div key={idx} className="space-y-2 border rounded-md p-3">
                <div className="flex gap-2 items-center">
                  <Input
                    placeholder="https://..."
                    value={url}
                    onChange={(e) => updateImage(idx, e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-red-600"
                    onClick={() => removeImageField(idx)}
                    disabled={imageUrls.length <= 1}
                  >
                    ✕
                  </Button>
                </div>
                {url?.trim() && (
                  <img
                    src={url}
                    alt={`Aperçu image ${idx + 1}`}
                    className="h-24 w-24 rounded border object-cover"
                  />
                )}
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              Option 1: collez un lien d&apos;image. Option 2: chargez un fichier depuis votre PC (Cloudinary).
              La première image sera utilisée comme image principale.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Variantes</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {variants.map((v, idx) => (
              <div key={v._id || idx} className="border rounded-lg p-4 space-y-3">
                <p className="text-sm font-medium">Variante {idx + 1}</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Nom</Label>
                    <Input value={v.name} onChange={(e) => updateVariant(idx, 'name', e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">SKU</Label>
                    <Input value={v.sku} onChange={(e) => updateVariant(idx, 'sku', e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Unité</Label>
                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={v.unit} onChange={(e) => updateVariant(idx, 'unit', e.target.value)}>
                      {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-5 gap-3">
                  <div>
                    <Label className="text-xs">Prix détail (DT)</Label>
                    <Input type="number" min="0" step="0.01" value={v.retailPrice} onChange={(e) => updateVariant(idx, 'retailPrice', e.target.value)} />
                  </div>
                  {(currentRole === 'SUPPLIER_PRIME' || currentRole === 'SUPER_SUPPLIER') && (
                    <div>
                      <Label className="text-xs">Prix gros (DT)</Label>
                      <Input type="number" min="0" step="0.01" value={v.bulkPrice} onChange={(e) => updateVariant(idx, 'bulkPrice', e.target.value)} />
                    </div>
                  )}
                  {currentRole === 'SUPER_SUPPLIER' && (
                    <div>
                      <Label className="text-xs">Prix super gros (DT)</Label>
                      <Input type="number" min="0" step="0.01" value={v.superGrossPrice} onChange={(e) => updateVariant(idx, 'superGrossPrice', e.target.value)} />
                    </div>
                  )}
                  <div>
                    <Label className="text-xs">Qté min gros</Label>
                    <Input type="number" min="1" value={v.minBulkQty} onChange={(e) => updateVariant(idx, 'minBulkQty', e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Stock</Label>
                    <Input type="number" min="0" value={v.stockQty} onChange={(e) => updateVariant(idx, 'stockQty', e.target.value)} />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Composition (Richesses garanties) *</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addAttribute}>+ Composant</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {attributes.length === 0 && (
              <p className="text-sm text-muted-foreground">Ajoutez au moins un composant avec sa concentration et son unité (ex: Zinc, 3, % P/V).</p>
            )}
            {attributes.map((attr, idx) => (
              <div key={idx} className="flex gap-3 items-end">
                <div className="flex-1">
                  <Label className="text-xs">Composant</Label>
                  <Input placeholder="Ex: Manganèse (Mn)" value={attr.key} onChange={(e) => {
                    const a = [...attributes]; a[idx] = { ...a[idx], key: e.target.value }; setAttributes(a);
                  }} />
                </div>
                <div className="flex-1">
                  <Label className="text-xs">Concentration</Label>
                  <Input placeholder="Ex: 3" value={attr.value} onChange={(e) => {
                    const a = [...attributes]; a[idx] = { ...a[idx], value: e.target.value }; setAttributes(a);
                  }} />
                </div>
                <div className="w-24">
                  <Label className="text-xs">Unité</Label>
                  <Input placeholder="% P/V" value={attr.unit} onChange={(e) => {
                    const a = [...attributes]; a[idx] = { ...a[idx], unit: e.target.value }; setAttributes(a);
                  }} />
                </div>
                <Button type="button" variant="outline" size="sm" className="text-red-600 h-10" onClick={() => removeAttribute(idx)}>
                  ✕
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Dosage (dynamic key/value/unit) */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Dosage</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addDosage}>+ Dosage</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {dosage.length === 0 && (
              <p className="text-sm text-muted-foreground">Ajoutez les dosages si nécessaire (ex: Substance active, 5, mg)</p>
            )}
            {dosage.map((d, idx) => (
              <div key={idx} className="flex gap-3 items-end">
                <div className="flex-1">
                  <Label className="text-xs">Substance</Label>
                  <Input value={d.key} onChange={(e) => { const arr = [...dosage]; arr[idx] = { ...arr[idx], key: e.target.value }; setDosage(arr); }} placeholder="Ex: Substance active" />
                </div>
                <div className="flex-1">
                  <Label className="text-xs">Quantité</Label>
                  <Input value={d.value} onChange={(e) => { const arr = [...dosage]; arr[idx] = { ...arr[idx], value: e.target.value }; setDosage(arr); }} placeholder="Ex: 5" />
                </div>
                <div className="w-24">
                  <Label className="text-xs">Unité</Label>
                  <Input value={d.unit} onChange={(e) => { const arr = [...dosage]; arr[idx] = { ...arr[idx], unit: e.target.value }; setDosage(arr); }} placeholder="mg" />
                </div>
                <Button type="button" variant="outline" size="sm" className="text-red-600 h-10" onClick={() => removeDosage(idx)}>✕</Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" size="lg" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Sauvegarde...' : 'Sauvegarder les modifications'}
          </Button>
          <Button type="button" variant="outline" size="lg" onClick={() => router.back()}>Annuler</Button>
        </div>
      </form>
    </div>
  );
}
