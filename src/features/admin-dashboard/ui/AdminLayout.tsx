'use client';

import React, { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import * as Dialog from '@radix-ui/react-dialog';
import { Globe, Menu, X } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { AdminSidebar } from './AdminSidebar';

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const t = useTranslations('admin.users');
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  const toggleLocale = () => {
    const nextLocale = locale === 'es' ? 'en' : 'es';
    document.cookie = `NEXT_LOCALE=${nextLocale};path=/;max-age=31536000`;
    router.replace(pathname);
    router.refresh();
  };

  return (
    <div className="flex min-h-[100dvh] bg-slate-50 text-foreground">
      <aside className="hidden w-64 border-r border-slate-200 lg:block">
        <AdminSidebar />
      </aside>

      <main className="flex-1 overflow-y-auto overscroll-contain">
        <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="flex h-16 items-center justify-between gap-3 px-4 md:px-6 lg:px-8">
            <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
              <Dialog.Trigger asChild>
                <Button
                  variant="outline"
                  className="h-11 w-11 border-slate-300 p-0 lg:hidden"
                  aria-label="Abrir menu de administracion"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/50" />
                <Dialog.Content className="fixed left-0 top-0 z-50 h-[100dvh] w-80 max-w-[90vw] border-r border-slate-800 bg-slate-900 outline-none">
                  <Dialog.Title className="sr-only">Menu de administracion</Dialog.Title>
                  <div className="flex h-16 items-center justify-end px-4">
                    <Dialog.Close asChild>
                      <Button
                        variant="ghost"
                        className="h-11 w-11 p-0 text-white hover:bg-slate-800"
                        aria-label="Cerrar menu de administracion"
                      >
                        <X className="h-5 w-5" />
                      </Button>
                    </Dialog.Close>
                  </div>
                  <div className="h-[calc(100dvh-4rem)]">
                    <AdminSidebar onNavigate={() => setMobileOpen(false)} />
                  </div>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>

            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={toggleLocale}
                className="inline-flex h-11 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                <Globe className="h-4 w-4" />
                {locale === 'es' ? t('language.spanish') : t('language.english')}
                <span className="text-xs text-slate-500">
                  {locale === 'es' ? t('language.switchToEnglish') : t('language.switchToSpanish')}
                </span>
              </button>
              <span className="hidden text-xs text-slate-500 sm:inline">{t('version', { value: '1.0.0' })}</span>
            </div>
          </div>
        </header>

        <div className="p-4 md:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
