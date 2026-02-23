'use client';

import { useEffect, useState } from 'react';
import { getStaffSession, signOutStaff } from '@/shared/api/supabase-auth';

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

  if (loading) return <p>Loading...</p>;

  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold mb-4">Staff Dashboard</h1>
      <p>Your role: {role}</p>
      <div className="mt-4">
        {role === 'receptionist' && <p>Receptionist features go here.</p>}
        {role === 'hygienist' && <p>Hygienist features go here.</p>}
        {role === 'dentist' && <p>Dentist features go here.</p>}
        {role === 'admin' && <p>Admin features go here.</p>}
      </div>
      <button
        className="mt-8 rounded bg-accent px-4 py-2 text-white"
        onClick={() => signOutStaff()}
      >
        Sign Out
      </button>
    </div>
  );
}
