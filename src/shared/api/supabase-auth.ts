import { signIn, signOut, auth } from '@/auth';
import type { StaffSession } from '@/entities/staff/model/staff.types';

export async function signInStaff(email: string, password: string): Promise<StaffSession | null> {
  try {
    await signIn('credentials', { email, password, redirect: false });
    return await getStaffSession();
  } catch {
    return null;
  }
}

export async function getStaffSession(): Promise<StaffSession | null> {
  const session = await auth();
  if (!session?.user?.email || !session.user.role) return null;
  return {
    userId: session.user.id ?? '',
    email: session.user.email,
    role: session.user.role,
  };
}

export async function signOutStaff(): Promise<void> {
  await signOut({ redirect: false });
}

export async function getServerSession() {
  return auth();
}
