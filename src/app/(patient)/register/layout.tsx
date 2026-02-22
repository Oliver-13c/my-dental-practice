import React, { ReactNode } from 'react';

export default function RegisterLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-4xl bg-surface rounded shadow p-8">
        {children}
      </div>
    </div>
  );
}
