'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { signIn } from 'next-auth/react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export const dynamic = 'force-dynamic';

export default function StaffLoginPage() {
  const t = useTranslations('staff.login');
  const router = useRouter();
  const supabase = createClientComponentClient();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [authMode, setAuthMode] = useState<'password' | 'magic'>('password');
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await signIn('credentials', { email, password, redirect: false });
    setLoading(false);
    if (!result || result.error) {
      setError(t('invalidCredentials'));
      return;
    }
    router.push('/staff/dashboard');
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      
      if (error) {
        setError(error.message);
      } else {
        setMagicLinkSent(true);
        setEmail('');
      }
    } catch (err) {
      setError('Failed to send magic link. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      setError('Enter your email address first, then click Forgot Password.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
      });
      if (error) {
        setError(error.message);
      } else {
        setResetSent(true);
      }
    } catch {
      setError('Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-background p-4">
      <div className="w-full max-w-md bg-surface rounded shadow p-6">
        <h1 className="text-2xl font-bold mb-4">{t('title')}</h1>
        
        {/* Auth Mode Toggle */}
        <div className="flex gap-2 mb-6 bg-gray-100 rounded p-1">
          <button
            type="button"
            onClick={() => {
              setAuthMode('password');
              setMagicLinkSent(false);
              setError(null);
            }}
            className={`flex-1 py-2 rounded transition ${
              authMode === 'password'
                ? 'bg-white text-gray-900 shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Password
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('magic');
              setError(null);
            }}
            className={`flex-1 py-2 rounded transition ${
              authMode === 'magic'
                ? 'bg-white text-gray-900 shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Magic Link
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Password Reset Sent Message */}
        {resetSent && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm">
            ✓ Password reset email sent! Check your inbox and click the link to set a new password.
          </div>
        )}

        {/* Magic Link Success Message */}
        {magicLinkSent && authMode === 'magic' && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm">
            ✓ Check your email for the magic link! Click the link to log in.
          </div>
        )}

        {/* Password Login Form */}
        {authMode === 'password' && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <label htmlFor="email" className="block">
              <span className="text-sm font-medium text-gray-700">{t('email')}</span>
              <input
                id="email"
                type="email"
                className="mt-1 w-full rounded border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="your.email@example.com"
              />
            </label>
            <label htmlFor="password" className="block">
              <span className="text-sm font-medium text-gray-700">{t('password')}</span>
              <input
                id="password"
                type="password"
                className="mt-1 w-full rounded border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded bg-blue-600 text-white py-2 font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? 'Signing in...' : t('login')}
            </button>
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={loading}
              className="w-full text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
            >
              Forgot Password?
            </button>
          </form>
        )}

        {/* Magic Link Form */}
        {authMode === 'magic' && (
          <form onSubmit={handleMagicLink} className="space-y-4">
            <label htmlFor="magic-email" className="block">
              <span className="text-sm font-medium text-gray-700">{t('email')}</span>
              <input
                id="magic-email"
                type="email"
                className="mt-1 w-full rounded border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="your.email@example.com"
                disabled={magicLinkSent}
              />
            </label>
            <p className="text-xs text-gray-600">
              We'll send you a secure link to log in instantly. No password needed.
            </p>
            <button
              type="submit"
              disabled={loading || magicLinkSent}
              className="w-full rounded bg-blue-600 text-white py-2 font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? 'Sending...' : magicLinkSent ? 'Link sent - check your email' : 'Send Magic Link'}
            </button>
            {magicLinkSent && (
              <button
                type="button"
                onClick={() => setMagicLinkSent(false)}
                className="w-full text-blue-600 text-sm hover:text-blue-700"
              >
                Send to a different email
              </button>
            )}
          </form>
        )}

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-gray-500">
          Staff login only. Contact your administrator if you don't have access.
        </p>
      </div>
    </div>
  );
}
