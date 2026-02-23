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

import { setRequestLocale } from 'next-intl/server';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  setRequestLocale('en');
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

