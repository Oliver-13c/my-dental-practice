import NextAuth, { type DefaultSession } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
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

        const adminEmail = process.env.AUTH_ADMIN_EMAIL;
        const adminPassword = process.env.AUTH_ADMIN_PASSWORD;
        if (!adminEmail || !adminPassword) return null;
        if (email !== adminEmail || password !== adminPassword) return null;

        return {
          id: 'admin',
          email,
          role: 'admin' as StaffRole,
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
