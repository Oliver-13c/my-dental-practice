import Link from 'next/link';

export default function Header() {
  return (
    <header className="w-full bg-teal-600 text-white p-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/en" className="text-lg font-semibold">
          My Dental Practice
        </Link>
        <nav>
          <Link href="/en" className="mr-4 hover:underline">
            Home
          </Link>
          <Link href="/en/book" className="hover:underline">
            Book
          </Link>
        </nav>
      </div>
    </header>
  );
}
