import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error('Auth callback error:', error.message);
      const errorUrl = new URL('/login', requestUrl.origin);
      errorUrl.searchParams.set('error', 'confirmation_failed');
      return NextResponse.redirect(errorUrl);
    }
  }

  return NextResponse.redirect(new URL('/login', requestUrl.origin));
}
