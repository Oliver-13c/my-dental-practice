import * as Sentry from '@sentry/nextjs';

/**
 * Captures an error in Sentry with extra context.
 * Safe to call even before Sentry is fully initialised (no-ops in that case).
 */
export function captureError(
  error: unknown,
  context?: Record<string, unknown>
): void {
  Sentry.withScope((scope) => {
    if (context) {
      scope.setExtras(context);
    }
    Sentry.captureException(error);
  });
}

/**
 * Logs a server-side message as a Sentry breadcrumb / event.
 * Useful for soft warnings that do not throw.
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'warning'
): void {
  Sentry.captureMessage(message, level);
}
