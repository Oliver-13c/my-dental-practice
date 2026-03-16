'use client';

import React from 'react';
import { cn } from '@/shared/lib/utils';

type ValidationState = 'default' | 'error' | 'success';

const validationClassMap: Record<ValidationState, string> = {
  default: 'border-border focus-visible:ring-ring',
  error: 'border-critical focus-visible:ring-critical',
  success: 'border-success focus-visible:ring-success',
};

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  validationState?: ValidationState;
}

export function Textarea({ className, validationState = 'default', ...props }: TextareaProps) {
  return (
    <textarea
      {...props}
      className={cn(
        'min-h-24 w-full rounded-md border bg-surface p-3 text-foreground outline-none transition placeholder:text-text-subtle focus-visible:ring-2',
        validationClassMap[validationState],
        className,
      )}
    />
  );
}
