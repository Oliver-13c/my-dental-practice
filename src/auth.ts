import NextAuth, { type DefaultSession } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { createClient } from '@supabase/supabase-js';
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
        if (!email || !password) {
          console.error('[auth] Missing email or password');
          return null;
        }

        try {
          // 1. Verify credentials using a dedicated anon-key client.
          //    We intentionally DON'T use the service-role client here because
          //    calling signInWithPassword on it switches the client's internal
          //    session to the user's JWT, which would cause all subsequent
          //    REST queries to go through RLS instead of bypassing it.
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';
          const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? '';
          
          const authClient = createClient(supabaseUrl, supabaseAnonKey, {
            auth: { persistSession: false },
          });

          console.log('[auth] Attempting signInWithPassword for:', email);

          const { data, error } = await authClient.auth.signInWithPassword({
            email,
            password,
          });

          if (error || !data.user) {
            console.error('[auth] Supabase signin FAILED:', error?.message ?? 'no user returned');
            return null;
          }

          console.log('[auth] signInWithPassword OK, user:', data.user.id);

          // 2. Look up staff profile using a FRESH service-role client.
          //    This client has never had signInWithPassword called on it,
          //    so it still uses the service role key → bypasses RLS.
          const adminClient = createServerClient<Database>();

          const { data: profile, error: profileError } = await (adminClient as any)
            .from('staff_profiles')
            .select('role, is_active')
            .eq('id', data.user.id)
            .single();

          if (profileError || !profile) {
            console.error(
              '[auth] Staff profile NOT FOUND for user:', data.user.id,
              'error:', profileError?.message ?? 'null result',
            );
            return null;
          }

          console.log('[auth] Profile found:', JSON.stringify(profile));

          if (!profile.is_active) {
            console.error('[auth] User account is INACTIVE:', data.user.id);
            return null;
          }

          console.log('[auth] Login authorized:', data.user.id, 'role:', profile.role);

          return {
            id: data.user.id,
            email: data.user.email,
            role: profile.role,
          };
        } catch (err) {
          console.error('[auth] Authorization EXCEPTION:', err);
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
