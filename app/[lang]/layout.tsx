import Providers from '@/app/providers';
import type { ReactNode } from 'react';

interface LocaleLayoutProps {
  children: ReactNode;
  params: { lang: string };
}

export default function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const lang = params.lang || 'en';

  return (
    <html lang={lang}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
