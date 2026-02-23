import type { Metadata } from 'next';
import Providers from './providers';
import '../styles/globals.css';

export const metadata: Metadata = {
  title: 'My Dental Practice',
  description: 'Appointment booking and management system for dental practice',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
