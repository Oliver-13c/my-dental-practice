import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  environment: process.env.NEXT_PUBLIC_APP_ENV ?? process.env.NODE_ENV,

  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,

  // Capture 10% of transactions for performance monitoring
  tracesSampleRate: 0.1,

  // Replay 1% of sessions, 100% when an error occurs
  replaysSessionSampleRate: 0.01,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration({
      // Mask all text and block all media by default to avoid capturing PII
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  beforeSend(event) {
    // Scrub sensitive fields from request data
    if (event.request?.data) {
      const sensitive = ['password', 'token', 'secret', 'ssn', 'dob', 'dateOfBirth'];
      const data = event.request.data as Record<string, unknown>;
      sensitive.forEach((key) => {
        if (key in data) data[key] = '[Filtered]';
      });
    }
    return event;
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
