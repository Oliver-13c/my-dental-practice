import { Resend } from 'resend';

const apiKey = process.env.RESEND_API_KEY ?? '';

if (!apiKey) {
  console.warn(
    '[resend-client] Missing RESEND_API_KEY environment variable — email sending will be disabled',
  );
}

// Only instantiate when the key is present — the Resend constructor throws on empty string
export const resend: Resend | null = apiKey ? new Resend(apiKey) : null;
