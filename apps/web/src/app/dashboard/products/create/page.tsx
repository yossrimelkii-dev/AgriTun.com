'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

const UNITS = ['UNIT', 'KG', 'G', 'L', 'ML', 'BOX', 'PALLET'] as const;
const SECTORS = ['MEDICAL', 'AGRICULTURAL', 'BOTH'] as const;
const VISIBILITY = [
  { value: 'PUBLIC', label: 'Public — Visible par tous' },
  { value: 'PRIME_ONLY', label: 'PRIME — Prix visible pour abonnés PRIME uniquement' },
  { value: 'HIDDEN', label: 'Caché — Prix masqué' },
] as const;

interface VariantForm {
  name: string;
  sku: string;
  stockQty: string;
  unit: string;
  retailPrice: string;
  bulkPrice: string;
  superGrossPrice: string;
  minBulkQty: string;
  weight: string;
  barcode: string;
}

function emptyVariant(): VariantForm {
  return { name: '', sku: '', stockQty: '0', unit: 'UNIT', retailPrice: '', bulkPrice: '', superGrossPrice: '', minBulkQty: '1', weight: '', barcode: '' };
}

export default function CreateProductPage() {
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Product fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [sector, setSector] = useState<string>('MEDICAL');
  const [priceVisibility, setPriceVisibility] = useState('PRIME_ONLY');
  const [tags, setTags] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>(['']);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [variants, setVariants] = useState<VariantForm[]>([emptyVariant()]);
  const [attributes, setAttributes] = useState<Array<{ key: string; value: string; unit: string }>>([]);
  const [dosage, setDosage] = useState<Array<{ key: string; value: string; unit: string }>>([]);

  // Category hierarchy state
  const [selectedRootId, setSelectedRootId] = useState('');
  const [selectedSubId, setSelectedSubId] = useState('');
  const [selectedSubSubId, setSelectedSubSubId] = useState('');

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
  });
  const allCategories: any[] = categoriesQuery.data?.categories || [];

  // Fetch current user session to check role (hide super gross inputs for regular SUPPLIER)
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

  // Derive hierarchy levels
  const rootCategories = allCategories.filter((c) => !c.parentId);
  const subCategories = selectedRootId
    ? allCategories.filter((c) => c.parentId?.toString() === selectedRootId)
    : [];
  const subSubCategories = selectedSubId
    ? allCategories.filter((c) => c.parentId?.toString() === selectedSubId)
    : [];

  // Sync categoryId to the deepest selected level
  function handleRootChange(id: string) {
    setSelectedRootId(id);
    setSelectedSubId('');
    setSelectedSubSubId('');
    // If this root has no children, it becomes the categoryId
    const hasChildren = allCategories.some((c) => c.parentId?.toString() === id);
    setCategoryId(hasChildren ? '' : id);
  }

  function handleSubChange(id: string) {
    setSelectedSubId(id);
    setSelectedSubSubId('');
    const hasChildren = allCategories.some((c) => c.parentId?.toString() === id);
    setCategoryId(hasChildren ? '' : id);
  }

  function handleSubSubChange(id: string) {
    setSelectedSubSubId(id);
    setCategoryId(id);
  }

  function addVariant() {
    setVariants((v) => [...v, emptyVariant()]);
  }

  function removeVariant(idx: number) {
    if (variants.length === 1) return;
    setVariants((v) => v.filter((_, i) => i !== idx));
  }

  function updateVariant(idx: number, field: keyof VariantForm, value: string) {
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
    } catch (uploadError: any) {
      toast({ title: uploadError?.message || 'Erreur lors de l\'upload image' });
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!name.trim()) { setError('Le nom du produit est requis'); return; }
    if (!categoryId) { setError('Veuillez sélectionner une catégorie'); return; }
    if (!variants[0]?.name || !variants[0]?.sku || !variants[0]?.retailPrice) {
      setError('Au moins une variante avec nom, SKU et prix est requise');
      return;
    }
    if (attributes.filter((a) => a.key && a.value).length === 0) {
      setError('La composition du produit est obligatoire');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        categoryId,
        sector,
        priceVisibility,
        images: imageUrls
          .map((url) => url.trim())
          .filter(Boolean)
          .map((url, index) => ({
            url,
            alt: name.trim() || undefined,
            order: index,
          })),
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        variants: variants.map((v) => ({
          name: v.name.trim(),
          sku: v.sku.trim(),
          stockQty: parseInt(v.stockQty) || 0,
          unit: v.unit,
          pricing: {
            retailPrice: parseFloat(v.retailPrice) || 0,
            bulkPrice: v.bulkPrice ? parseFloat(v.bulkPrice) : undefined,
              superGrossPrice: v.superGrossPrice ? parseFloat(v.superGrossPrice) : undefined,
            minBulkQty: parseInt(v.minBulkQty) || 1,
            currency: 'TND',
          },
          weight: v.weight ? parseFloat(v.weight) : undefined,
          barcode: v.barcode.trim() || undefined,
        })),
        attributes: attributes.filter((a) => a.key && a.value).map((a) => ({
          key: a.key.trim(),
          value: a.value.trim(),
          unit: a.unit.trim() || undefined,
        })),
        dosage: dosage.filter((d) => d.key && d.value).map((d) => ({
          key: d.key.trim(),
          value: d.value.trim(),
          unit: d.unit.trim() || undefined,
        })),
      };

      const res = await fetch('/api/dashboard/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) {
        setError(result.error || 'Erreur de création');
        return;
      }

      toast({ title: 'Produit créé avec succès ✓' });
      router.push('/dashboard/products');
    } catch {
      setError('Erreur réseau');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Ajouter un Produit</h1>
        <p className="text-muted-foreground">Remplissez les informations pour créer un nouveau produit</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">{error}</div>
        )}

        {/* Basic info */}
        <Card>
          <CardHeader><CardTitle>Informations générales</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Nom du produit *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Gants d'examen nitrile" className="mt-1" />
            </div>

            <div>
              <Label>Description</Label>
              <textarea
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Décrivez votre produit en détail..."
                maxLength={10000}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Secteur *</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                  value={sector}
                  onChange={(e) => {
                    setSector(e.target.value);
                    setSelectedRootId('');
                    setSelectedSubId('');
                    setSelectedSubSubId('');
                    setCategoryId('');
                  }}
                >
                  {SECTORS.map((s) => (
                    <option key={s} value={s}>{s === 'MEDICAL' ? '🏥 Équipement des animaux' : s === 'AGRICULTURAL' ? '🌾 Agricole' : '🔄 Les Deux'}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Visibilité des prix</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                  value={priceVisibility}
                  onChange={(e) => setPriceVisibility(e.target.value)}
                >
                  {VISIBILITY.map((v) => (
                    <option key={v.value} value={v.value}>{v.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Cascading category picker */}
            <div>
              <Label>Catégorie *</Label>
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

            <div>
              <Label>Tags (séparés par virgule)</Label>
              <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="médical, gants, nitrile" className="mt-1" />
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

        {/* Variants */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Variantes *</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addVariant}>+ Variante</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {variants.map((v, idx) => (
              <div key={idx} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Variante {idx + 1}</p>
                  {variants.length > 1 && (
                    <Button type="button" variant="outline" size="sm" className="text-red-600 h-7" onClick={() => removeVariant(idx)}>
                      Supprimer
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Nom *</Label>
                    <Input value={v.name} onChange={(e) => updateVariant(idx, 'name', e.target.value)} placeholder="Standard" />
                  </div>
                  <div>
                    <Label className="text-xs">SKU *</Label>
                    <Input value={v.sku} onChange={(e) => updateVariant(idx, 'sku', e.target.value)} placeholder="GNT-NIR-001" />
                  </div>
                  <div>
                    <Label className="text-xs">Unité</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={v.unit}
                      onChange={(e) => updateVariant(idx, 'unit', e.target.value)}
                    >
                      {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-5 gap-3">
                  <div>
                    <Label className="text-xs">Prix détail (DT) *</Label>
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
                    <Label className="text-xs">Stock initial</Label>
                    <Input type="number" min="0" value={v.stockQty} onChange={(e) => updateVariant(idx, 'stockQty', e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Poids (kg)</Label>
                    <Input type="number" min="0" step="0.01" value={v.weight} onChange={(e) => updateVariant(idx, 'weight', e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Code-barres</Label>
                    <Input value={v.barcode} onChange={(e) => updateVariant(idx, 'barcode', e.target.value)} />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Attributes */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Composition (Richesses garanties) *</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addAttribute}>+ Composant</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {attributes.length === 0 && (
              <p className="text-sm text-muted-foreground">Ajoutez au moins un composant avec sa concentration et son unité (ex: Azote, 10.5, % P/V).</p>
            )}
            {attributes.map((attr, idx) => (
              <div key={idx} className="flex gap-3 items-end">
                <div className="flex-1">
                  <Label className="text-xs">Composant</Label>
                  <Input value={attr.key} onChange={(e) => {
                    const a = [...attributes];
                    a[idx] = { ...a[idx], key: e.target.value };
                    setAttributes(a);
                  }} placeholder="Ex: Azote (N) uréique" />
                </div>
                <div className="flex-1">
                  <Label className="text-xs">Concentration</Label>
                  <Input value={attr.value} onChange={(e) => {
                    const a = [...attributes];
                    a[idx] = { ...a[idx], value: e.target.value };
                    setAttributes(a);
                  }} placeholder="Ex: 10,5" />
                </div>
                <div className="w-24">
                  <Label className="text-xs">Unité</Label>
                  <Input value={attr.unit} onChange={(e) => {
                    const a = [...attributes];
                    a[idx] = { ...a[idx], unit: e.target.value };
                    setAttributes(a);
                  }} placeholder="mm" />
                </div>
                <Button type="button" variant="outline" size="sm" className="text-red-600 h-10" onClick={() => removeAttribute(idx)}>✕</Button>
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

        {/* Submit */}
        <div className="flex gap-4">
          <Button type="submit" size="lg" disabled={loading}>
            {loading ? 'Création...' : 'Créer le produit (Brouillon)'}
          </Button>
          <Button type="button" variant="outline" size="lg" onClick={() => router.back()}>
            Annuler
          </Button>
        </div>
      </form>
    </div>
  );
}
