import { notFound } from 'next/navigation';
import { use } from 'react';
import { readFileSync } from 'fs';

interface PageProps {
  params: { lang: string };
}

export default function LocalePage({ params }: PageProps) {
  const lang = params.lang;

  // Basic health-check page per locale
  return (
    <main className="min-h-screen flex items-center justify-center bg-background">
      <div className="p-8 bg-surface rounded shadow">
        <h1 className="text-2xl font-bold">My Dental Practice ({lang})</h1>
        <p className="mt-2 text-muted-foreground">Welcome to the localized site.</p>
      </div>
    </main>
  );
}
