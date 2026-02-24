import type { ReactNode } from 'react';
import Header from '@/widgets/Header/Header';

type Dictionary = Record<string, unknown> & { nav?: { home?: string; book?: string; login?: string } };

const dictionaries: Record<string, () => Promise<Dictionary>> = {
  en: () => import('../dictionaries/en.json').then((m) => m.default as Dictionary),
  es: () => import('../dictionaries/es.json').then((m) => m.default as Dictionary),
};

async function getDictionary(lang: string): Promise<Dictionary> {
  const loader = dictionaries[lang] ?? dictionaries.en;
  return loader();
}

export default async function LangLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return (
    <>
      <Header lang={lang} dict={dict} />
      <main>{children}</main>
    </>
  );
}
