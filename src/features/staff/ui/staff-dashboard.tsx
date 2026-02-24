'use client';

import { useSession, signOut } from 'next-auth/react';
import { DentistDashboard } from './dentist-dashboard';
import { ReceptionistDashboard } from './receptionist-dashboard';

export function StaffDashboard() {
  const { data: session, status } = useSession();
  const role = session?.user?.role ?? null;

  if (status === 'loading') return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading dashboard...</div>;

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
              onClick={() => signOut({ callbackUrl: '/staff/login' })}
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
        {role === 'receptionist' && <ReceptionistDashboard />}
        {role === 'dentist' && <DentistDashboard />}
        {role === 'hygienist' && <DentistDashboard /> /* Reuse dentist for now as clinical placeholder */}
        {role === 'admin' && (
          <>
            <section className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">System Administration</h2>
              <p className="text-sm text-gray-600">Admin controls will be provisioned here.</p>
            </section>
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-800">Front Desk</h2>
              <ReceptionistDashboard />
            </section>
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-800">Clinical</h2>
              <DentistDashboard />
            </section>
          </>
        )}
        {!role && <p className="text-red-500">Error: Unrecognized role</p>}
      </main>
    </div>
  );
}
