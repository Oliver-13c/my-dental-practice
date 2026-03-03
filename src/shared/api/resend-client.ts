import { Resend } from 'resend';

const apiKey = process.env.RESEND_API_KEY ?? '';

if (!apiKey) {
  console.warn(
    '[resend-client] Missing RESEND_API_KEY environment variable — email sending will fail at runtime',
  );
}

export const resend = new Resend(apiKey);
