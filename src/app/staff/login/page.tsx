use client;

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { signInStaff } from '@/shared/api/supabase-auth';

export default function StaffLoginPage() {
  const t = useTranslations('staff.login');
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const staffSession = await signInStaff(email, password);
    setLoading(false);
    if (!staffSession) {
      setError(t('invalidCredentials'));
      return;
    }
    // Redirect based on role
    switch (staffSession.role) {
      case 'admin':
        router.push('/staff/admin');
        break;
      case 'dentist':
        router.push('/staff/dentist');
        break;
      case 'hygienist':
        router.push('/staff/hygienist');
        break;
      case 'receptionist':
        router.push('/staff/dashboard');
        break;
      default:
        router.push('/staff/login');
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-background">
      <form onSubmit={handleSubmit} className="p-6 w-full max-w-md bg-surface rounded shadow">
        <h1 className="text-2xl font-bold mb-4">{t('title')}</h1>
        {error && <p className="text-red-600 mb-4">{error}</p>}
        <label htmlFor="email" className="block mb-1">
          {t('email')}
          <input
            id="email"
            type="email"
            className="mt-1 w-full rounded border border-gray-300 p-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </label>
        <label htmlFor="password" className="block mb-1">
          {t('password')}
          <input
            id="password"
            type="password"
            className="mt-1 w-full rounded border border-gray-300 p-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="mt-4 w-full rounded bg-primary text-white py-2 disabled:opacity-50"
        >
          {loading ? t('loading') : t('login')}
        </button>
      </form>
    </div>
  );
}
