import React from 'react';

export default function LangLayout({ children, params }: { children: React.ReactNode; params: { lang: string } }) {
  const { lang } = params;
  return (
    <html lang={lang}>
      <body>
        <div className="min-h-screen bg-background text-text_primary">{children}</div>
      </body>
    </html>
  );
}
