'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface Profile {
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  phone: string;
  companyName: string;
  city: string;
  country: string;
  avatarUrl: string;
  bio: string;
}

interface FormState {
  firstName: string;
  lastName: string;
  companyName: string;
  phone: string;
  city: string;
  country: string;
  avatarUrl: string;
  bio: string;
}

const EMPTY: FormState = {
  firstName: '',
  lastName: '',
  companyName: '',
  phone: '',
  city: '',
  country: '',
  avatarUrl: '',
  bio: '',
};

export default function TrainingCenterSettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [initDone, setInitDone] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['engineer-profile'],
    queryFn: async () => {
      const res = await fetch('/api/engineer/profile');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const profile: Profile | undefined = data?.profile;

  useEffect(() => {
    if (profile && !initDone) {
      setForm({
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        companyName: profile.companyName || '',
        phone: profile.phone || '',
        city: profile.city || '',
        country: profile.country || '',
        avatarUrl: profile.avatarUrl || '',
        bio: profile.bio || '',
      });
      setInitDone(true);
    }
  }, [profile, initDone]);

  const saveMutation = useMutation({
    mutationFn: async (payload: Partial<FormState>) => {
      const res = await fetch('/api/engineer/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error || 'Sauvegarde échouée');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['engineer-profile'] });
      toast({ title: 'Paramètres sauvegardés ✓' });
    },
    onError: (err: any) => {
      toast({ title: 'Erreur', description: err?.message || 'Sauvegarde échouée' });
    },
  });

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/uploads/invoice-logo', { method: 'POST', body: formData });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Upload failed');
      setForm((f) => ({ ...f, avatarUrl: json.url }));
      saveMutation.mutate({ avatarUrl: json.url });
    } catch (err: any) {
      toast({ title: 'Échec du téléchargement', description: err?.message });
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    saveMutation.mutate(form);
  }

  if (isLoading) {
    return (
      <div className="flex-1 p-6 md:p-8 space-y-6 max-w-2xl">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  const isTrainingCenter = profile?.role === 'TRAINING_CENTER';

  return (
    <div className="flex-1 p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Paramètres</h1>
        <p className="text-muted-foreground">
          {isTrainingCenter
            ? 'Mettez à jour les informations de votre centre de formation.'
            : 'Mettez à jour votre profil.'}
        </p>
      </div>

      <div className="grid gap-6 max-w-2xl">
        {/* Identity */}
        <Card>
          <CardHeader>
            <CardTitle>Identité</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-24 h-24 rounded-full border bg-muted/30 overflow-hidden shrink-0 flex items-center justify-center">
                  {form.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={form.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl font-bold text-muted-foreground">
                      {(form.companyName || form.firstName || 'C')[0]?.toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <Label className="text-sm font-semibold">Logo / Photo</Label>
                  <p className="text-xs text-muted-foreground">
                    Format PNG ou JPG, 4 Mo max.
                  </p>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={uploadingAvatar}
                      onClick={() => avatarInputRef.current?.click()}
                    >
                      {uploadingAvatar
                        ? 'Téléchargement...'
                        : form.avatarUrl
                          ? 'Remplacer'
                          : 'Téléverser'}
                    </Button>
                    {form.avatarUrl && !uploadingAvatar && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setForm((f) => ({ ...f, avatarUrl: '' }));
                          saveMutation.mutate({ avatarUrl: '' });
                        }}
                      >
                        Supprimer
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {isTrainingCenter && (
                <div>
                  <Label htmlFor="companyName">Nom du centre de formation</Label>
                  <Input
                    id="companyName"
                    value={form.companyName}
                    onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
                    maxLength={200}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">Prénom</Label>
                  <Input
                    id="firstName"
                    value={form.firstName}
                    onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Nom</Label>
                  <Input
                    id="lastName"
                    value={form.lastName}
                    onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+216 55 123 456"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">Ville</Label>
                  <Input
                    id="city"
                    value={form.city}
                    onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="country">Pays</Label>
                  <Input
                    id="country"
                    value={form.country}
                    onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="bio">Description</Label>
                <textarea
                  id="bio"
                  className="mt-1 min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.bio}
                  onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                  maxLength={2000}
                  placeholder={
                    isTrainingCenter
                      ? "Décrivez votre centre de formation, votre approche, votre public..."
                      : 'À propos de vous'
                  }
                />
              </div>

              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Sauvegarde...' : 'Sauvegarder'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Account */}
        <Card>
          <CardHeader>
            <CardTitle>Compte</CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <p className="text-xs text-muted-foreground">Adresse email</p>
              <p className="font-medium">{profile?.email}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
