import React from 'react';
import { cn } from '@/shared/lib/utils';

export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <table className={cn('w-full border-collapse overflow-hidden rounded-lg border border-border bg-surface', className)}>
      {children}
    </table>
  );
}

export function TableHead({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <thead className={cn('bg-surface-muted', className)}>
      {children}
    </thead>
  );
}

export function TableHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={cn('border-b border-border px-4 py-2 text-left text-sm font-semibold text-foreground', className)}>
      {children}
    </th>
  );
}

export function TableBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <tbody className={cn('', className)}>
      {children}
    </tbody>
  );
}

export function TableRow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <tr className={cn('border-b border-border/80 transition hover:bg-surface-muted/70', className)}>
      {children}
    </tr>
  );
}

export function TableCell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <td className={cn('px-4 py-2 text-sm text-foreground', className)}>
      {children}
    </td>
  );
}
