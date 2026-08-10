export const locales = ['fr', 'en', 'ar'] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'fr';

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}

export function localeDirection(locale: Locale): 'ltr' | 'rtl' {
  return locale === 'ar' ? 'rtl' : 'ltr';
}

export function resolveLocaleFromAcceptLanguage(headerValue: string | null | undefined): Locale {
  if (!headerValue) return defaultLocale;

  const lower = headerValue.toLowerCase();
  if (lower.includes('ar')) return 'ar';
  if (lower.includes('en')) return 'en';
  return 'fr';
}
