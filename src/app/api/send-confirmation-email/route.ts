import { NextRequest, NextResponse } from 'next/server';
import { sendBookingConfirmationEmail } from '@/features/notifications/api/sendEmail';

// POST /api/send-confirmation-email — send booking confirmation email
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, lang = 'en' } = body;

    if (!email) {
      return NextResponse.json({ error: 'email is required' }, { status: 400 });
    }

    await sendBookingConfirmationEmail(email, lang);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Send confirmation email error:', err);
    return NextResponse.json({ error: 'Failed to send confirmation email' }, { status: 500 });
  }
}
