'use client';

export default function AdminDashboard() {
  return (
    <div className="max-w-7xl">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
      <p className="text-gray-600 mb-8">Welcome to the admin dashboard</p>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {/* Stats Cards */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="text-gray-600 text-sm font-medium">Total Staff</div>
          <div className="mt-2">
            <div className="text-3xl font-bold text-gray-900">—</div>
            <p className="text-xs text-gray-500 mt-2">Loading...</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="text-gray-600 text-sm font-medium">Active Users</div>
          <div className="mt-2">
            <div className="text-3xl font-bold text-gray-900">—</div>
            <p className="text-xs text-gray-500 mt-2">Loading...</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="text-gray-600 text-sm font-medium">Inactive Users</div>
          <div className="mt-2">
            <div className="text-3xl font-bold text-gray-900">—</div>
            <p className="text-xs text-gray-500 mt-2">Loading...</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="text-gray-600 text-sm font-medium">Recent Actions</div>
          <div className="mt-2">
            <div className="text-3xl font-bold text-gray-900">—</div>
            <p className="text-xs text-gray-500 mt-2">Loading...</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="space-y-2">
          <a
            href="/staff/admin/users/create"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            ➕ Create New User
          </a>
        </div>
      </div>
    </div>
  );
}
