'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 text-center">
          <h2 className="text-2xl font-semibold text-foreground">Something went wrong</h2>
          <p className="mt-2 text-sm text-text-muted">An unexpected error occurred. Please try again.</p>
          <button
            type="button"
            onClick={reset}
            className="mt-6 rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-muted"
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
