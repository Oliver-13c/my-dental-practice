import React from 'react';
import { cn } from '@/shared/lib/utils';

type FeedbackType = 'error' | 'success' | 'info';

const toneMap: Record<FeedbackType, string> = {
  error: 'border-critical/40 bg-critical/10 text-critical',
  success: 'border-success/40 bg-success/10 text-success',
  info: 'border-info/40 bg-info/10 text-info',
};

export function FormFeedback({
  type,
  message,
  className,
}: {
  type: FeedbackType;
  message: string;
  className?: string;
}) {
  return (
    <div className={cn('rounded-md border px-3 py-2 text-sm', toneMap[type], className)} role="status">
      {message}
    </div>
  );
}
