import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { cookies, headers } from 'next/headers';
import './globals.css';
import { Providers } from '@/components/providers';
import {
  defaultLocale,
  isLocale,
  localeDirection,
  resolveLocaleFromAcceptLanguage,
} from '@/lib/i18n/config';
import { messages } from '@/lib/i18n/messages';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: 'TunAgri — B2B Marketplace Médical & Agricole',
    template: '%s | TunAgri',
  },
  description:
    'Plateforme B2B pour les secteurs médical et agricole en Tunisie. Trouvez des fournisseurs vérifiés, comparez les prix et commandez en gros.',
  keywords: ['B2B', 'marketplace', 'médical', 'agricole', 'Tunisie', 'fournisseur', 'grossiste'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = cookies();
  const headerStore = headers();
  const cookieLocale = cookieStore.get('locale')?.value;
  const locale = isLocale(cookieLocale)
    ? cookieLocale
    : resolveLocaleFromAcceptLanguage(headerStore.get('accept-language'));
  const dir = localeDirection(locale ?? defaultLocale);

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <head>
        {/* Preconnect only to hosts we consistently fetch from. Cloudinary hosts
            user uploads (logos, product images) and Unsplash is the home page's
            default category art. Extra preconnects show up as "Unused" in
            Lighthouse, so keep this list short. */}
        <link rel="preconnect" href="https://res.cloudinary.com" crossOrigin="" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
        <link rel="preconnect" href="https://images.unsplash.com" crossOrigin="" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
      </head>
      <body className={inter.className}>
        <Providers locale={locale} messages={messages[locale]}>{children}</Providers>
      </body>
    </html>
  );
}
