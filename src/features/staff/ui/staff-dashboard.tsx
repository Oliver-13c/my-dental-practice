'use client';

import { useEffect, useState } from 'react';
import { getStaffSession, signOutStaff } from '@/shared/api/supabase-auth';
import { DentistDashboard } from './dentist-dashboard';
import { ReceptionistDashboard } from './receptionist-dashboard';

export function StaffDashboard() {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSession() {
      const session = await getStaffSession();
      if (session) {
        setRole(session.role);
      }
      setLoading(false);
    }
    fetchSession();
  }, []);

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading dashboard...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">
            {role === 'receptionist' && 'Front Desk'}
            {role === 'dentist' && 'Doctor Portal'}
            {role === 'hygienist' && 'Hygiene Portal'}
            {role === 'admin' && 'Admin Settings'}
            {!role && 'Staff Dashboard'}
          </h1>
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-gray-500 capitalize px-3 py-1 bg-gray-100 rounded-full">{role}</span>
            <button
              className="text-sm font-medium text-red-600 hover:text-red-500"
              onClick={() => signOutStaff()}
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {role === 'receptionist' && <ReceptionistDashboard />}
        {role === 'dentist' && <DentistDashboard />}
        {role === 'hygienist' && <DentistDashboard /> /* Reuse dentist for now as clinical placeholder */}
        {role === 'admin' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">System Administration</h2>
            <p className="text-sm text-gray-600">Admin controls will be provisioned here.</p>
          </div>
        )}
        {!role && <p className="text-red-500">Error: Unrecognized role</p>}
      </main>
    </div>
  );
}
