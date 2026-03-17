'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  BarChart3,
  Bell,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  MessageSquare,
  Users,
  UserRound,
} from 'lucide-react';
import { Button } from '@/shared/ui/button';

type AdminSidebarProps = {
  onNavigate?: () => void;
};

type MenuItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

export function AdminSidebar({ onNavigate }: AdminSidebarProps) {
  const t = useTranslations('admin');
  const tc = useTranslations('contacts');
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  const menuItems: MenuItem[] = [
    { href: '/admin', label: t('dashboard'), icon: LayoutDashboard },
    { href: '/admin/users', label: t('usersNav'), icon: Users },
    { href: '/admin/appointments', label: t('appointments'), icon: CalendarDays },
    { href: '/admin/staff', label: t('staff'), icon: UserRound },
    { href: '/admin/contacts', label: tc('title'), icon: MessageSquare },
    { href: '/admin/reminders', label: t('remindersNav'), icon: Bell },
    { href: '/admin/audit-logs', label: t('auditLogs'), icon: ClipboardList },
    { href: '/admin/analytics', label: t('analytics'), icon: BarChart3 },
  ];

  return (
    <aside className="flex h-full w-full flex-col bg-slate-900 text-white">
      <div className="border-b border-slate-700 p-6">
        <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
        <p className="mt-1 text-sm text-slate-300">{t('systemAdministration')}</p>
      </div>

      <nav className="flex-1 space-y-2 overflow-y-auto p-4">
        {menuItems.map((item) => (
          <Link key={item.href} href={item.href} onClick={onNavigate}>
            <Button
              variant={isActive(item.href) ? 'default' : 'ghost'}
              className={`w-full justify-start text-left ${
                isActive(item.href)
                  ? 'h-11 bg-blue-600 text-white hover:bg-blue-700'
                  : 'h-11 text-slate-100 hover:bg-slate-800'
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Button>
          </Link>
        ))}
      </nav>

      <div className="space-y-3 border-t border-slate-700 p-4">
        <Link
          href="/staff/dashboard"
          onClick={onNavigate}
          className="flex h-11 w-full items-center justify-center rounded-lg bg-slate-800 px-3 text-sm text-slate-100 transition-colors hover:bg-slate-700"
        >
          <Activity className="mr-2 h-4 w-4" />
          {t('users.openStaffDashboard')}
        </Link>
      </div>
    </aside>
  );
}
