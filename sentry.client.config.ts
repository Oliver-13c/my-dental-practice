import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // Capture 100% of transactions in dev/staging; tune down for production
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,

  // Replay sessions on errors only (production)
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,

  integrations: [
    Sentry.replayIntegration(),
  ],

  // Only print Sentry debug output in non-production environments
  debug: process.env.NODE_ENV !== 'production',
});
