'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createEmptyKeyValueLine, type KeyValueLine } from '@/lib/key-value-lines';

type Props = {
  label: string;
  description?: string;
  entries: KeyValueLine[];
  onChange: (entries: KeyValueLine[]) => void;
  titlePlaceholder?: string;
  valuePlaceholder?: string;
  addLabel?: string;
};

export function KeyValueLineEditor({
  label,
  description,
  entries,
  onChange,
  titlePlaceholder = 'Titre',
  valuePlaceholder = 'Valeur',
  addLabel = 'Ajouter une ligne',
}: Props) {
  const safeEntries = entries.length > 0 ? entries : [createEmptyKeyValueLine()];

  const updateEntry = (index: number, field: keyof KeyValueLine, value: string) => {
    const next = safeEntries.map((entry, currentIndex) =>
      currentIndex === index ? { ...entry, [field]: value } : entry,
    );
    onChange(next);
  };

  const removeEntry = (index: number) => {
    if (safeEntries.length === 1) {
      onChange([createEmptyKeyValueLine()]);
      return;
    }

    onChange(safeEntries.filter((_, currentIndex) => currentIndex !== index));
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label>{label}</Label>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </div>

      <div className="space-y-3">
        {safeEntries.map((entry, index) => (
          <div key={`${label}-${index}`} className="grid gap-3 rounded-xl border p-3 md:grid-cols-[1fr_1.3fr_auto] md:items-start">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Titre</Label>
              <Input
                value={entry.title}
                onChange={(e) => updateEntry(index, 'title', e.target.value)}
                placeholder={titlePlaceholder}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Valeur</Label>
              <Input
                value={entry.value}
                onChange={(e) => updateEntry(index, 'value', e.target.value)}
                placeholder={valuePlaceholder}
              />
            </div>
            <div className="md:pt-7">
              <Button type="button" variant="outline" onClick={() => removeEntry(index)}>
                Supprimer
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" onClick={() => onChange([...safeEntries, createEmptyKeyValueLine()])}>
        {addLabel}
      </Button>
    </div>
  );
}
