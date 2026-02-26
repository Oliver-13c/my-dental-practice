import NextAuth, { type DefaultSession } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { createServerClient } from '@/shared/api/supabase-server';
import type { Database } from '@/shared/api/supabase-types';
import type { StaffRole } from '@/entities/staff/model/staff.types';
import { logAudit } from '@/shared/lib/audit';

declare module 'next-auth' {
  interface Session {
    user: {
      role: StaffRole;
    } & DefaultSession['user'];
  }
  interface User {
    role: StaffRole;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        try {
          const supabase = createServerClient<Database>();

          // Sign in with Supabase Auth
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error || !data.user) {
            console.error('[auth] Supabase signin error:', error?.message);
            return null;
          }

          // Get staff profile with role
          const { data: profile, error: profileError } = await (supabase as any)
            .from('staff_profiles')
            .select('role, is_active')
            .eq('id', data.user.id)
            .single();

          if (profileError || !profile) {
            console.error('[auth] Staff profile not found:', profileError?.message);
            return null;
          }

          if (!profile.is_active) {
            console.error('[auth] User account is inactive');
            return null;
          }

          return {
            id: data.user.id,
            email: data.user.email,
            role: profile.role,
          };
        } catch (err) {
          console.error('[auth] Authorization error:', err);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        (token as typeof token & { role: StaffRole }).role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      session.user.role = (token as typeof token & { role: StaffRole }).role;
      return session;
    },
  },
  pages: {
    signIn: '/staff/login',
  },
  events: {
    async signIn({ user }) {
      // Only log if user.id exists
      if (user.id) {
        await logAudit(user.id, 'login', 'user', user.id, { email: user.email });
      }
    },
    async signOut(message) {
      const token = 'token' in message ? message.token : null;
      const userId = token?.sub ?? 'unknown';
      await logAudit(userId, 'logout', 'user', userId);
    },
  },
});
