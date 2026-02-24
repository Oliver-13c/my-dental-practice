import Link from 'next/link';

interface NavDict {
  home?: string;
  book?: string;
  login?: string;
}

interface HeaderProps {
  lang: string;
  dict?: { nav?: NavDict };
}

export default function Header({ lang, dict }: HeaderProps) {
  const otherLang = lang === 'en' ? 'es' : 'en';
  const nav = dict?.nav ?? {};

  return (
    <header className="w-full bg-teal-600 text-white p-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href={`/${lang}`} className="text-lg font-semibold">
          My Dental Practice
        </Link>
        <nav className="flex items-center gap-4">
          <Link href={`/${lang}`} className="hover:underline">
            {nav.home ?? 'Home'}
          </Link>
          <Link href={`/${lang}/book`} className="hover:underline">
            {nav.book ?? 'Book'}
          </Link>
          <Link href="/staff/login" className="hover:underline">
            {nav.login ?? 'Login'}
          </Link>
          <Link
            href={`/${otherLang}`}
            className="rounded border border-white/60 px-2 py-0.5 text-sm text-teal-100 hover:bg-teal-500"
          >
            {otherLang.toUpperCase()}
          </Link>
        </nav>
      </div>
    </header>
  );
}
