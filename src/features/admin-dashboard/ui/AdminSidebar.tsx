'use client';

import React from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/shared/ui/button';

export function AdminSidebar() {
  const t = useTranslations('admin');
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  const toggleLocale = () => {
    const newLocale = locale === 'es' ? 'en' : 'es';
    document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=31536000`;
    router.refresh();
  };

  const menuItems = [
    { href: '/admin', label: t('dashboard') || 'Dashboard', icon: '📊' },
    { href: '/admin/users', label: t('users') || 'Users', icon: '👥' },
    { href: '/admin/appointments', label: t('appointments') || 'Appointments', icon: '📅' },
    { href: '/admin/staff', label: t('staff') || 'Staff', icon: '👨‍⚕️' },
    { href: '/admin/audit-logs', label: t('auditLogs') || 'Audit Logs', icon: '📋' },
    { href: '/admin/analytics', label: t('analytics') || 'Analytics', icon: '📈' },
  ];

  return (
    <aside className="w-64 bg-gray-900 text-white h-screen flex flex-col fixed left-0 top-0">
      <div className="p-6 border-b border-gray-700">
        <h1 className="text-2xl font-bold">{t('admin') || 'Admin'}</h1>
        <p className="text-sm text-gray-400">{t('systemAdministration') || 'System Administration'}</p>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-2">
        {menuItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <Button
              variant={isActive(item.href) ? 'default' : 'ghost'}
              className={`w-full justify-start text-left ${
                isActive(item.href)
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              <span className="mr-3">{item.icon}</span>
              {item.label}
            </Button>
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-700 space-y-3">
        <button
          onClick={toggleLocale}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors text-sm"
        >
          <span>🌐 {locale === 'es' ? 'Español' : 'English'}</span>
          <span className="text-xs text-gray-400">
            → {locale === 'es' ? 'EN' : 'ES'}
          </span>
        </button>
        <Link
          href="/staff/dashboard"
          className="block w-full text-center px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors text-sm text-gray-300"
        >
          ← {locale === 'es' ? 'Volver al Panel' : 'Back to Dashboard'}
        </Link>
        <p className="text-xs text-gray-400">v1.0.0</p>
      </div>
    </aside>
  );
}
