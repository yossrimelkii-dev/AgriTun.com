export type KeyValueLine = {
  title: string;
  value: string;
};

export function createEmptyKeyValueLine(): KeyValueLine {
  return { title: '', value: '' };
}

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : String(value ?? '').trim();
}

export function parseKeyValueLines(input: unknown): KeyValueLine[] {
  if (Array.isArray(input)) {
    return input
      .map((entry) => ({
        title: normalizeText((entry as Record<string, unknown>)?.title),
        value: normalizeText((entry as Record<string, unknown>)?.value),
      }))
      .filter((entry) => entry.title.length > 0 || entry.value.length > 0);
  }

  if (typeof input !== 'string') {
    return [];
  }

  return input
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const separators = [' : ', ':', ' — ', ' - '];
      for (const separator of separators) {
        const index = line.indexOf(separator);
        if (index > -1) {
          return {
            title: line.slice(0, index).trim(),
            value: line.slice(index + separator.length).trim(),
          };
        }
      }

      return { title: '', value: line };
    })
    .filter((entry) => entry.title.length > 0 || entry.value.length > 0);
}

export function serializeKeyValueLines(input: unknown): string {
  const lines = parseKeyValueLines(input)
    .map((entry) => {
      const title = entry.title.trim();
      const value = entry.value.trim();

      if (!title && !value) return '';
      if (title && value) return `${title}: ${value}`;
      return title || value;
    })
    .filter(Boolean);

  return lines.join('\n');
}

export function hasKeyValueLines(input: unknown): boolean {
  return parseKeyValueLines(input).length > 0;
}
