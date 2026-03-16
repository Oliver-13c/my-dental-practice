import React from 'react';
import { cn } from '@/shared/lib/utils';

type SkeletonVariant = 'text' | 'card' | 'table-row' | 'avatar';

function classesForVariant(variant: SkeletonVariant) {
  switch (variant) {
    case 'avatar':
      return 'h-10 w-10 rounded-full';
    case 'table-row':
      return 'h-11 w-full rounded-md';
    case 'card':
      return 'h-24 w-full rounded-lg';
    default:
      return 'h-4 w-full rounded';
  }
}

export function Skeleton({
  className,
  variant = 'text',
  count = 1,
}: {
  className?: string;
  variant?: SkeletonVariant;
  count?: number;
}) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className={cn('animate-pulse bg-surface-muted', classesForVariant(variant), className)}
        />
      ))}
    </div>
  );
}
