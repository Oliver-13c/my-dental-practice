import NextAuth, { type DefaultSession } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { createClient } from '@supabase/supabase-js';
import type { StaffRole } from '@/entities/staff/model/staff.types';

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

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (!supabaseUrl || !supabaseAnonKey) return null;

        const sb = createClient(supabaseUrl, supabaseAnonKey, {
          auth: { persistSession: false },
        });

        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error || !data.user) return null;

        const { data: profile, error: profileError } = await sb
          .from('staff_profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();

        // Clean up the Supabase session — NextAuth manages its own session
        await sb.auth.signOut();

        if (profileError || !profile) return null;

        return {
          id: data.user.id,
          email: data.user.email ?? email,
          role: profile.role as StaffRole,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) (token as typeof token & { role: StaffRole }).role = user.role;
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
});
