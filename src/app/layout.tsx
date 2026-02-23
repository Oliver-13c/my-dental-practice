import type { Metadata } from 'next';
import Providers from './providers';
import '../styles/globals.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'My Dental Practice',
  description: 'Appointment booking and management system for dental practice',
  icons: {
    icon: '/favicon.svg',
  },
};

import { setRequestLocale, getMessages } from 'next-intl/server';
import { NextIntlClientProvider } from 'next-intl';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  setRequestLocale('en');
  const messages = await getMessages();

  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <NextIntlClientProvider messages={messages}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

