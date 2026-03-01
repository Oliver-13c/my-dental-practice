import React from 'react';
import { AdminSidebar } from './AdminSidebar';

export function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar />
      <main className="flex-1 overflow-auto ml-64">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
