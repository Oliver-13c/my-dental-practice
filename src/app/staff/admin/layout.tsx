'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { href: '/staff/admin', label: 'Dashboard', icon: '📊' },
    { href: '/staff/admin/users', label: 'Users', icon: '👥' },
    { href: '/staff/admin/audit-logs', label: 'Audit Logs', icon: '📋' },
    { href: '/staff/admin/settings', label: 'Settings', icon: '⚙️' },
  ];

  const isActive = (href: string) => {
    if (href === '/staff/admin') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
          <p className="text-sm text-gray-600">Dental Practice Management</p>
        </div>

        <nav className="space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                isActive(item.href)
                  ? 'bg-blue-50 text-blue-600 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <hr className="my-6" />

        <div className="text-xs text-gray-500">
          <p>Admin Dashboard</p>
          <p>v1.0</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
