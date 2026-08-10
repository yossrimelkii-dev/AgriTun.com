'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface SupplierOption {
  _id: string;
  companyName: string;
  slug: string;
}

interface SuperList {
  _id: string;
  name: string;
  isPublished: boolean;
  supplierIds: string[];
  createdAt: string;
}

export default function SuperListsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<string[]>([]);
  const [isPublished, setIsPublished] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch user's super lists
  const { data: listsData, isLoading: listsLoading } = useQuery({
    queryKey: ['super-lists'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/super-lists');
      if (!res.ok) throw new Error('Failed to fetch lists');
      return res.json();
    },
  });

  // Fetch available suppliers (all PRIME suppliers or regular suppliers)
  const { data: suppliersData, isLoading: suppliersLoading } = useQuery({
    queryKey: ['suppliers-all'],
    queryFn: async () => {
      const res = await fetch('/api/suppliers?all=true&limit=1000');
      if (!res.ok) throw new Error('Failed to fetch suppliers');
      return res.json();
    },
  });

  const lists: SuperList[] = listsData?.lists || [];
  const availableSuppliers: SupplierOption[] = suppliersData?.suppliers || [];

  // Filter suppliers based on search term
  const filteredSuppliers = availableSuppliers.filter((supplier) =>
    supplier.companyName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Initialize selected IDs from first list
  if (lists.length > 0 && selectedSupplierIds.length === 0) {
    setSelectedSupplierIds(lists[0].supplierIds || []);
  }

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/dashboard/super-lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to save list');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-lists'] });
      toast({ title: 'Liste mise à jour ✓' });
    },
    onError: () => {
      toast({ title: 'Erreur de sauvegarde' });
    },
  });

  function toggleSupplier(supplierId: string) {
    setSelectedSupplierIds((prev) =>
      prev.includes(supplierId)
        ? prev.filter((id) => id !== supplierId)
        : [...prev, supplierId]
    );
  }

  function handleSave() {
    saveMutation.mutate({
      supplierIds: selectedSupplierIds,
      isPublished,
    });
  }

  if (listsLoading || suppliersLoading) {
    return (
      <div className="space-y-4 max-w-3xl">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Gestion de la Liste Prime</h1>
        <p className="text-muted-foreground">
          Sélectionnez les fournisseurs autorisés à voir vos prix super gros
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Liste des Fournisseurs Autorisés</CardTitle>
            <div className="flex items-center gap-2">
              <Label htmlFor="publish" className="text-sm">
                Publier
              </Label>
              <input
                id="publish"
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="w-4 h-4 rounded border-input"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {availableSuppliers.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Aucun fournisseur disponible
            </p>
          ) : (
            <>
              <div className="space-y-3">
                <Label htmlFor="search-suppliers" className="text-sm font-medium">
                  Rechercher un fournisseur
                </Label>
                <Input
                  id="search-suppliers"
                  placeholder="Tapez le nom du fournisseur..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="rounded-lg"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto border rounded-lg p-4 bg-muted/30">
                {filteredSuppliers.length === 0 ? (
                  <p className="text-muted-foreground text-sm col-span-full text-center py-6">
                    Aucun fournisseur trouvé pour "{searchTerm}"
                  </p>
                ) : (
                  filteredSuppliers.map((supplier) => (
                    <label
                      key={supplier._id}
                      className="flex items-center gap-2 p-2 hover:bg-muted rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedSupplierIds.includes(supplier._id)}
                        onChange={() => toggleSupplier(supplier._id)}
                        className="w-4 h-4 rounded border-input"
                      />
                      <span className="text-sm">{supplier.companyName}</span>
                    </label>
                  ))
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleSave}
                  disabled={saveMutation.isPending}
                  size="lg"
                >
                  {saveMutation.isPending ? 'Sauvegarde...' : 'Sauvegarder la liste'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSelectedSupplierIds([])}
                  disabled={selectedSupplierIds.length === 0}
                >
                  Tout désélectionner
                </Button>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                <strong>{selectedSupplierIds.length}</strong> fournisseur(s) sélectionné(s)
                {filteredSuppliers.length > 0 && (
                  <span> • {filteredSuppliers.length} résultats trouvés</span>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {lists.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Informations de la liste actuelle</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Nom:</span> {lists[0].name}
              </div>
              <div>
                <span className="font-medium">Statut:</span>{' '}
                {lists[0].isPublished ? (
                  <span className="text-green-600">✓ Publiée</span>
                ) : (
                  <span className="text-gray-500">Brouillon</span>
                )}
              </div>
              <div>
                <span className="font-medium">Dernière mise à jour:</span>{' '}
                {new Date(lists[0].createdAt).toLocaleDateString('fr-FR')}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
