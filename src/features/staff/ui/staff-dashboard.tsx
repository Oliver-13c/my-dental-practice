'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { DentistDashboard } from './dentist-dashboard';
import { ReceptionistDashboard } from './receptionist-dashboard';
import { useSessionExpiry } from '@/features/session-management/hooks/use-session-expiry';
import { createClient } from '@/shared/api/supabase-browser';

export function StaffDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const role = session?.user?.role ?? null;
  const [supabaseRole, setSupabaseRole] = useState<string | null>(null);
  const [provisioning, setProvisioning] = useState(false);

  useSessionExpiry();

  // If no NextAuth session, check Supabase session and auto-provision profile
  useEffect(() => {
    if (status !== 'loading' && !role) {
      const supabase = createClient();
      supabase.auth.getUser().then(async ({ data: { user } }) => {
        if (!user) return;

        // User is authenticated via Supabase but has no NextAuth session.
        // Try to provision their staff_profiles row.
        setProvisioning(true);
        try {
          const res = await fetch('/api/auth/provision-profile', {
            method: 'POST',
          });
          const data = await res.json();
          if (res.ok && data.role) {
            setSupabaseRole(data.role);
          }
        } catch (err) {
          console.error('Profile provision failed:', err);
        } finally {
          setProvisioning(false);
        }
      });
    }
  }, [status, role]);

  const effectiveRole = role || supabaseRole;

  // Admins go directly to the admin panel
  useEffect(() => {
    if (effectiveRole === 'admin') {
      router.replace('/admin');
    }
  }, [effectiveRole, router]);

  if (status === 'loading' || provisioning || effectiveRole === 'admin') return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading dashboard...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">
            {effectiveRole === 'receptionist' && 'Front Desk'}
            {effectiveRole === 'dentist' && 'Doctor Portal'}
            {effectiveRole === 'hygienist' && 'Hygiene Portal'}
            {!effectiveRole && 'Staff Dashboard'}
          </h1>
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-gray-500 capitalize px-3 py-1 bg-gray-100 rounded-full">{effectiveRole}</span>
            <button
              className="text-sm font-medium text-red-600 hover:text-red-500"
              onClick={() => {
                // Sign out of both Supabase and NextAuth
                const supabase = createClient();
                supabase.auth.signOut().then(() => {
                  signOut({ callbackUrl: '/staff/login' });
                });
              }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
        {effectiveRole === 'receptionist' && <ReceptionistDashboard />}
        {effectiveRole === 'dentist' && <DentistDashboard />}
        {effectiveRole === 'hygienist' && <DentistDashboard /> /* Reuse dentist for now as clinical placeholder */}
        {!effectiveRole && <p className="text-red-500">Error: Unrecognized role</p>}
      </main>
    </div>
  );
}
