import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function SignUpPage() {
  // Public self-signup is disabled; accounts are provisioned by admins.
  redirect('/staff/login?error=signup_disabled');
}