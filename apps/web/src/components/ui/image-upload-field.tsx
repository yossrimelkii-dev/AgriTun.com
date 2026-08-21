'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Upload, X } from 'lucide-react';

interface Props {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  helpText?: string;
  aspectRatio?: 'square' | 'video' | 'wide';
  disabled?: boolean;
}

const ASPECT_CLASS: Record<NonNullable<Props['aspectRatio']>, string> = {
  square: 'aspect-square',
  video: 'aspect-video',
  wide: 'aspect-[16/8]',
};

/**
 * ImageUploadField — dual-mode image input.
 * - Upload from device (POST to Cloudinary via /api/uploads/invoice-logo).
 * - Or paste a public image URL.
 * Both write to `value` via `onChange(url)`.
 */
export function ImageUploadField({
  value,
  onChange,
  label = 'Image',
  helpText = 'Téléversez depuis votre appareil ou collez un lien (PNG/JPG, 4 Mo max).',
  aspectRatio = 'wide',
  disabled,
}: Props) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/uploads/invoice-logo', {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Upload failed');
      onChange(json.url);
      toast({ title: 'Image téléversée ✓' });
    } catch (err: any) {
      toast({ title: 'Échec du téléchargement', description: err?.message });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {helpText && <p className="text-xs text-muted-foreground">{helpText}</p>}

      <div className={`relative w-full overflow-hidden rounded-lg border bg-muted/20 ${ASPECT_CLASS[aspectRatio]}`}>
        {value ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="Aperçu" className="h-full w-full object-cover" />
            {!disabled && (
              <button
                type="button"
                onClick={() => onChange('')}
                className="absolute top-2 right-2 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80 transition"
                aria-label="Supprimer l'image"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </>
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">Aucune image</p>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
        disabled={disabled || uploading}
      />

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || uploading}
        >
          <Upload className="h-4 w-4 mr-2" />
          {uploading ? 'Téléversement...' : value ? 'Remplacer' : 'Téléverser'}
        </Button>
      </div>

      <div>
        <Label className="text-xs text-muted-foreground">Ou coller un lien</Label>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://..."
          disabled={disabled}
          className="mt-1"
        />
      </div>
    </div>
  );
}
