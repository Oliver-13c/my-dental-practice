import React from 'react';
import { cn } from '@/shared/lib/utils';

type CardDensity = 'comfortable' | 'compact';
type CardStatus = 'default' | 'success' | 'warning' | 'critical' | 'info';

const densityClassMap: Record<CardDensity, string> = {
  comfortable: 'p-6',
  compact: 'p-4',
};

const statusClassMap: Record<CardStatus, string> = {
  default: 'border-border',
  success: 'border-success/40',
  warning: 'border-warning/40',
  critical: 'border-critical/40',
  info: 'border-info/40',
};

export function Card({
  children,
  className,
  density = 'compact',
  status = 'default',
}: {
  children: React.ReactNode;
  className?: string;
  density?: CardDensity;
  status?: CardStatus;
}) {
  return (
    <div
      className={cn(
        'rounded-lg border bg-surface text-foreground shadow-sm',
        densityClassMap[density],
        statusClassMap[status],
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('mb-3 flex flex-col gap-1', className)}>{children}</div>;
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h3 className={cn('text-base font-semibold text-foreground', className)}>{children}</h3>;
}

export function CardDescription({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn('text-sm text-text-muted', className)}>{children}</p>;
}

export function CardContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('', className)}>{children}</div>;
}

export function CardFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('mt-4 flex items-center gap-2', className)}>{children}</div>;
}
