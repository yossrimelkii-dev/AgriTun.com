'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { Locale } from '@/lib/i18n/config';
import { defaultLocale, localeDirection } from '@/lib/i18n/config';
import { messages as allMessages, type Messages } from '@/lib/i18n/messages';

type LocaleContextValue = {
  locale: Locale;
  dir: 'ltr' | 'rtl';
  setLocale: (nextLocale: Locale) => void;
  t: (key: string, fallback?: string) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function getNested(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object' && part in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj);
}

export function LocaleProvider({
  initialLocale,
  messages,
  children,
}: {
  initialLocale: Locale;
  messages: Messages;
  children: ReactNode;
}) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<Locale>(initialLocale || defaultLocale);

  const t = useCallback(
    (key: string, fallback?: string) => {
      const fromCurrent = getNested(messages as Record<string, unknown>, key);
      if (typeof fromCurrent === 'string') return fromCurrent;

      const fromDefault = getNested(allMessages[defaultLocale] as Record<string, unknown>, key);
      if (typeof fromDefault === 'string') return fromDefault;

      return fallback ?? key;
    },
    [messages]
  );

  const setLocale = useCallback(
    (nextLocale: Locale) => {
      setLocaleState(nextLocale);
      const dir = localeDirection(nextLocale);
      document.cookie = `locale=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
      document.documentElement.lang = nextLocale;
      document.documentElement.dir = dir;
      router.refresh();
    },
    [router]
  );

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      dir: localeDirection(locale),
      setLocale,
      t,
    }),
    [locale, setLocale, t]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useI18n must be used within LocaleProvider');
  return ctx;
}
