'use client';

import Image from 'next/image';
import { useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

interface CategoryItem {
  _id: string;
  name: string;
  slug: string;
  icon?: string;
  image?: string;
  sector: string;
  depth: number;
  sortOrder: number;
  isActive: boolean;
  parentId: string | null;
  ancestors?: Array<{ name: string }>;
  createdAt: string;
}

export default function AdminCategoriesPage() {
  const [sectorFilter, setSectorFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<'ROOT' | 'SUB'>('ROOT');
  const [newCat, setNewCat] = useState({ name: '', slug: '', sector: 'MEDICAL', icon: '', image: '', parentId: '' });
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['admin-categories', sectorFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (sectorFilter) params.set('sector', sectorFilter);
      const query = params.toString();
      const url = query ? `/api/admin/categories?${query}` : '/api/admin/categories';
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || 'Impossible de charger les catégories');
      }
      return res.json();
    },
    retry: 1,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newCat,
          parentId: newCat.parentId || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      setShowForm(false);
      resetForm();
      toast({ title: 'Catégorie créée ✓' });
    },
    onError: (err: Error) => {
      toast({ title: err.message || 'Erreur de création' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingCategoryId) throw new Error('Catégorie à modifier introuvable');

      const res = await fetch(`/api/admin/categories/${editingCategoryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCat.name,
          slug: newCat.slug,
          sector: newCat.sector,
          icon: newCat.icon,
          image: newCat.image,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      setShowForm(false);
      resetForm();
      toast({ title: 'Catégorie mise à jour ✓' });
    },
    onError: (err: Error) => {
      toast({ title: err.message || 'Erreur de mise à jour' });
    },
  });

  const categories: CategoryItem[] = data?.categories || [];

  const rootCategories = categories.filter((c) => !c.parentId);
  const filteredParentOptions = useMemo(
    () => rootCategories.filter((c) => newCat.sector === 'BOTH' || c.sector === newCat.sector || c.sector === 'BOTH'),
    [rootCategories, newCat.sector]
  );

  const canCreate =
    newCat.name.trim().length > 0 &&
    newCat.slug.trim().length > 0 &&
    newCat.sector.length > 0 &&
    (formMode === 'ROOT' || !!newCat.parentId);

  const isEditing = !!editingCategoryId;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const previewImage = newCat.image.trim();

  function resetForm() {
    setNewCat({ name: '', slug: '', sector: 'MEDICAL', icon: '', image: '', parentId: '' });
    setFormMode('ROOT');
    setEditingCategoryId(null);
  }

  function startEdit(cat: CategoryItem) {
    setEditingCategoryId(cat._id);
    setShowForm(true);
    setFormMode(cat.parentId ? 'SUB' : 'ROOT');
    setNewCat({
      name: cat.name,
      slug: cat.slug,
      sector: cat.sector,
      icon: cat.icon || '',
      image: cat.image || '',
      parentId: cat.parentId || '',
    });
  }

  async function handleImageUpload(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Veuillez choisir une image valide.' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Image trop volumineuse (max 5 Mo).' });
      return;
    }
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/uploads/category-image', {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Upload failed');
      setNewCat((prev) => ({ ...prev, image: json.url }));
      toast({ title: 'Image téléversée' });
    } catch (err: any) {
      toast({
        title: 'Échec du téléversement',
        description: err?.message || String(err),
      });
    } finally {
      setUploadingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gestion des Catégories</h1>
          <p className="text-muted-foreground">
            {categories.length} catégorie{categories.length > 1 ? 's' : ''} au total
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm
            ? 'Annuler'
            : '+ Nouvelle Catégorie'}
        </Button>
      </div>

      {/* Create form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{isEditing ? 'Modifier la catégorie' : 'Nouvelle catégorie'}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {isEditing
                ? 'Modifiez le nom, le slug, le secteur ou l’icône puis enregistrez.'
                : 'Choisissez d&apos;abord le type (racine ou sous-catégorie), puis complétez les champs.'}
            </p>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (!canCreate) {
                  toast({ title: 'Complétez les champs requis (nom, slug et parent pour une sous-catégorie).' });
                  return;
                }
                if (isEditing) {
                  updateMutation.mutate();
                } else {
                  createMutation.mutate();
                }
              }}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={isEditing}
                  onClick={() => {
                    setFormMode('ROOT');
                    setNewCat((prev) => ({ ...prev, parentId: '' }));
                  }}
                  className={`rounded-lg border p-3 text-left transition ${
                    formMode === 'ROOT' ? 'border-primary bg-primary/5' : 'hover:bg-muted'
                  } ${isEditing ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <p className="font-medium text-sm">Catégorie racine</p>
                  <p className="text-xs text-muted-foreground">Ex: Équipement médical</p>
                </button>

                <button
                  type="button"
                  disabled={isEditing}
                  onClick={() => setFormMode('SUB')}
                  className={`rounded-lg border p-3 text-left transition ${
                    formMode === 'SUB' ? 'border-primary bg-primary/5' : 'hover:bg-muted'
                  } ${isEditing ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <p className="font-medium text-sm">Sous-catégorie</p>
                  <p className="text-xs text-muted-foreground">Ex: Imagerie médicale</p>
                </button>
              </div>

              {isEditing && (
                <p className="text-xs text-muted-foreground">
                  Le type et la catégorie parente ne sont pas modifiables dans cette version.
                </p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Nom *</label>
                  <Input
                    placeholder="Ex: Imagerie médicale"
                    value={newCat.name}
                    onChange={(e) =>
                      setNewCat({
                        ...newCat,
                        name: e.target.value,
                        slug: e.target.value
                          .toLowerCase()
                          .trim()
                          .replace(/\s+/g, '-')
                          .replace(/[^a-z0-9-]/g, ''),
                      })
                    }
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">Slug *</label>
                  <Input
                    placeholder="imagerie-medicale"
                    value={newCat.slug}
                    onChange={(e) => setNewCat({ ...newCat, slug: e.target.value })}
                    required
                  />
                  <p className="text-xs text-muted-foreground">URL: /categories/{newCat.slug || 'votre-slug'}</p>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">Secteur *</label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={newCat.sector}
                    onChange={(e) => setNewCat({ ...newCat, sector: e.target.value })}
                  >
                    <option value="MEDICAL">Médical</option>
                    <option value="AGRICULTURAL">Agricole</option>
                    <option value="BOTH">Les deux</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">Icône (optionnel)</label>
                  <Input placeholder="Ex: 🩺" value={newCat.icon} onChange={(e) => setNewCat({ ...newCat, icon: e.target.value })} />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-sm font-medium">Image de fond (optionnel)</label>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <Input
                      placeholder="https://... ou chargez une image"
                      value={newCat.image}
                      onChange={(e) => setNewCat({ ...newCat, image: e.target.value })}
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => imageInputRef.current?.click()}
                        disabled={uploadingImage}
                      >
                        {uploadingImage ? 'Téléversement…' : 'Choisir un fichier'}
                      </Button>
                      {newCat.image && !uploadingImage && (
                        <Button type="button" variant="ghost" onClick={() => setNewCat((prev) => ({ ...prev, image: '' }))}>
                          Effacer
                        </Button>
                      )}
                    </div>
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageUpload(e.target.files?.[0] || null)}
                    />
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Collez une URL d’image ou importez un fichier image pour personnaliser l’arrière-plan.
                  </p>

                  {previewImage && (
                    <div className="mt-2 overflow-hidden rounded-lg border bg-muted/30">
                      <div className="relative h-40 w-full">
                        <Image
                          src={previewImage}
                          alt="Aperçu de la catégorie"
                          fill
                          className="object-cover"
                          unoptimized={previewImage.startsWith('data:')}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {formMode === 'SUB' && (
                <div className="space-y-1">
                  <label className="text-sm font-medium">Catégorie parente *</label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={newCat.parentId}
                    onChange={(e) => setNewCat({ ...newCat, parentId: e.target.value })}
                    required
                    disabled={isEditing}
                  >
                    <option value="">— Choisir une catégorie parente —</option>
                    {filteredParentOptions.map((c) => (
                      <option key={c._id} value={c._id}>{c.icon} {c.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">Astuce: sélectionnez le secteur avant le parent pour filtrer la liste.</p>
                </div>
              )}

              <div className="flex gap-2">
                <Button type="submit" disabled={isSubmitting || !canCreate}>
                  {isSubmitting
                    ? isEditing ? 'Enregistrement...' : 'Création...'
                    : isEditing
                      ? 'Enregistrer les modifications'
                      : formMode === 'SUB'
                        ? 'Créer la sous-catégorie'
                        : 'Créer la catégorie'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm} disabled={isSubmitting}>
                  Réinitialiser
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Sector filter */}
      <div className="flex gap-2">
        {[
          { value: '', label: 'Tous' },
          { value: 'MEDICAL', label: '🏥 Médical' },
          { value: 'AGRICULTURAL', label: '🌾 Agricole' },
          { value: 'BOTH', label: '🔄 Les deux' },
        ].map((opt) => (
          <Button
            key={opt.value}
            variant={sectorFilter === opt.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSectorFilter(opt.value)}
          >
            {opt.label}
          </Button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <Card>
          <CardContent className="py-10 text-center space-y-3">
            <p className="font-medium">Échec du chargement des catégories</p>
            <p className="text-sm text-muted-foreground">{(error as Error)?.message || 'Erreur inconnue'}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              {isFetching ? 'Rechargement...' : 'Réessayer'}
            </Button>
          </CardContent>
        </Card>
      ) : categories.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Aucune catégorie trouvée</p>
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium">Catégorie</th>
                <th className="text-left px-4 py-3 text-sm font-medium">Secteur</th>
                <th className="text-left px-4 py-3 text-sm font-medium">Hiérarchie</th>
                <th className="text-center px-4 py-3 text-sm font-medium">Ordre</th>
                <th className="text-left px-4 py-3 text-sm font-medium">Statut</th>
                <th className="text-right px-4 py-3 text-sm font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {categories.map((cat) => (
                <tr key={cat._id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 text-sm">
                    <span style={{ paddingLeft: `${cat.depth * 1.5}rem` }} className="flex items-center gap-2">
                      {cat.depth > 0 && <span className="text-muted-foreground">└</span>}
                      <span>{cat.icon}</span>
                      <span className="font-medium">{cat.name}</span>
                      <span className="text-muted-foreground text-xs">/{cat.slug}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {cat.sector === 'MEDICAL' ? '🏥' : cat.sector === 'AGRICULTURAL' ? '🌾' : '🔄'}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {cat.ancestors?.map((a) => a.name).join(' → ') || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-center">{cat.sortOrder}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${cat.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {cat.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="outline" onClick={() => startEdit(cat)}>
                      Modifier
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
