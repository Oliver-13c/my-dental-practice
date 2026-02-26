'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

const errorMessages: Record<string, string> = {
  missing_token: 'Missing confirmation token. Please check the email link.',
  invalid_token: 'Invalid or expired confirmation token. Please request a new one.',
  otp_expired: 'This link is invalid or has expired. Please request a new one.',
  access_denied: 'This link is invalid or has expired. Please request a new one.',
  callback_failed: 'Confirmation failed. Please try again or contact support.',
  unknown: 'An error occurred during confirmation.',
};

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error') || 'unknown';
  const customMessage = searchParams.get('message');
  const message = customMessage || errorMessages[error] || errorMessages.unknown;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-lg p-8 max-w-md w-full">
        <div className="text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 mb-4">
            <svg
              className="h-6 w-6 text-rose-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Confirmation Failed
          </h1>
          <p className="text-slate-600 mb-6">{message}</p>

          <div className="space-y-3">
            <Link
              href="/staff/login"
              className="block w-full rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Back to Login
            </Link>
            <Link
              href="/"
              className="block w-full rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Go Home
            </Link>
          </div>

          <p className="text-xs text-slate-500 mt-6">
            Need help?{' '}
            <a href="mailto:support@example.com" className="text-slate-700 hover:underline">
              Contact support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
