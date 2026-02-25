'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface StaffMember {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
}

export default function UsersPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const response = await fetch('/api/admin/users');
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch staff');
        }

        setStaff(data.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchStaff();
  }, []);

  return (
    <div className="max-w-7xl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Users</h1>
          <p className="text-gray-600">Manage staff members and permissions</p>
        </div>
        <Link
          href="/staff/admin/users/create"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          ➕ Create User
        </Link>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading staff members...</p>
        </div>
      ) : staff.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500">No staff members found</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Name</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Email</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Role</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((member) => (
                <tr key={member.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {member.first_name} {member.last_name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{member.email}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 capitalize">{member.role}</td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        member.is_active
                          ? 'bg-green-50 text-green-700'
                          : 'bg-red-50 text-red-700'
                      }`}
                    >
                      {member.is_active ? '✓ Active' : '✕ Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <button
                      onClick={() => {
                        // TODO: Implement password reset
                        alert('Password reset functionality coming soon');
                      }}
                      className="text-blue-600 hover:text-blue-800 font-medium text-xs"
                    >
                      Reset Password
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
