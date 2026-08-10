'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { LocaleProvider } from '@/components/providers/locale-provider';
import type { Locale } from '@/lib/i18n/config';
import type { Messages } from '@/lib/i18n/messages';

export function Providers({
  children,
  locale,
  messages,
}: {
  children: ReactNode;
  locale: Locale;
  messages: Messages;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <LocaleProvider initialLocale={locale} messages={messages}>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster />
      </QueryClientProvider>
    </LocaleProvider>
  );
}
