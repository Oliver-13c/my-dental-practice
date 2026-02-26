'use client';

import React from 'react';
import { SessionProvider } from 'next-auth/react';
import SupabaseAuthListener from '@/features/authentication/SupabaseAuthListener';

interface ProvidersProps {
  children: React.ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <SupabaseAuthListener />
      {children}
    </SessionProvider>
  );
}
