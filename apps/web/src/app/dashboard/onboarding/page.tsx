'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const SECTORS = [
  { value: 'MEDICAL', label: 'Équipement des animaux', icon: '🏥', desc: 'Équipements, soins et matériel dédiés aux animaux' },
  { value: 'AGRICULTURAL', label: 'Produits Agricoles', icon: '🌾', desc: 'Semences, engrais, machines agricoles' },
  { value: 'BOTH', label: 'Les Deux Secteurs', icon: '🔄', desc: 'Produits médicaux et agricoles' },
];

const GOVERNORATES = [
  'Tunis', 'Ariana', 'Ben Arous', 'Manouba', 'Nabeul', 'Zaghouan', 'Bizerte', 'Béja',
  'Jendouba', 'Le Kef', 'Siliana', 'Sousse', 'Monastir', 'Mahdia', 'Sfax', 'Kairouan',
  'Kasserine', 'Sidi Bouzid', 'Gabès', 'Médenine', 'Tataouine', 'Gafsa', 'Tozeur', 'Kébili',
];

export default function SupplierOnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sector, setSector] = useState('');

  const [form, setForm] = useState({
    companyName: '',
    description: '',
    city: '',
    wilaya: '',
    phone: '',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.companyName.trim() || !sector) {
      setError('Veuillez remplir le nom d\'entreprise et choisir un secteur');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/supplier/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, sector }),
      });

      const result = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          // Profile already exists, just redirect
          router.push('/dashboard/overview');
          return;
        }
        setError(result.error || 'Erreur lors de la création du profil');
        return;
      }

      router.push('/dashboard/overview');
    } catch {
      setError('Erreur réseau');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-muted/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="text-4xl mb-2">🏭</div>
          <CardTitle className="text-2xl">Configurez votre profil fournisseur</CardTitle>
          <CardDescription>
            Complétez ces informations pour activer votre espace de gestion
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">{error}</div>
            )}

            {/* Sector selection */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Secteur d&apos;activité *</Label>
              <div className="grid grid-cols-3 gap-3">
                {SECTORS.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setSector(s.value)}
                    className={`flex flex-col items-center p-4 border-2 rounded-xl transition text-center ${
                      sector === s.value
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                        : 'border-muted hover:border-muted-foreground/30'
                    }`}
                  >
                    <span className="text-3xl mb-2">{s.icon}</span>
                    <span className="text-sm font-medium">{s.label}</span>
                    <span className="text-[11px] text-muted-foreground mt-1">{s.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Company info */}
            <div className="space-y-4">
              <div>
                <Label>Nom de l&apos;entreprise *</Label>
                <Input
                  placeholder="Ex: MedPharma Tunisie SARL"
                  value={form.companyName}
                  onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Description de votre activité</Label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Décrivez votre activité, vos produits et services..."
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  maxLength={500}
                />
              </div>
            </div>

            {/* Address */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">Adresse</Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Ville</Label>
                  <Input
                    placeholder="Ex: Tunis"
                    value={form.city}
                    onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Gouvernorat</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                    value={form.wilaya}
                    onChange={(e) => setForm((f) => ({ ...f, wilaya: e.target.value }))}
                  >
                    <option value="">Sélectionner...</option>
                    {GOVERNORATES.map((w) => (
                      <option key={w} value={w}>{w}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Contact */}
            <div>
              <Label>Téléphone</Label>
              <Input
                type="tel"
                placeholder="Ex: +216 55 123 456"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="mt-1"
              />
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? 'Création du profil...' : 'Créer mon espace fournisseur →'}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Votre profil sera vérifié par notre équipe. Vous pourrez commencer à ajouter vos produits immédiatement.
            </p>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}
