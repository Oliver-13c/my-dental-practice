'use client';

import React from 'react';
import { cn } from '@/shared/lib/utils';

type InputSize = 'sm' | 'md' | 'lg';
type ValidationState = 'default' | 'error' | 'success';

const sizeClassMap: Record<InputSize, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-3 text-sm',
  lg: 'h-12 px-4 text-base',
};

const validationClassMap: Record<ValidationState, string> = {
  default: 'border-border focus-visible:ring-ring',
  error: 'border-critical focus-visible:ring-critical',
  success: 'border-success focus-visible:ring-success',
};

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  inputSize?: InputSize;
  validationState?: ValidationState;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
}

export function Input({
  className,
  inputSize = 'md',
  validationState = 'default',
  leadingIcon,
  trailingIcon,
  ...props
}: InputProps) {
  const inputEl = (
    <input
      {...props}
      className={cn(
        'w-full rounded-md border bg-surface text-foreground outline-none transition placeholder:text-text-subtle focus-visible:ring-2',
        sizeClassMap[inputSize],
        validationClassMap[validationState],
        leadingIcon && 'pl-9',
        trailingIcon && 'pr-9',
        className,
      )}
    />
  );

  if (!leadingIcon && !trailingIcon) return inputEl;

  return (
    <div className="relative">
      {leadingIcon && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-subtle">{leadingIcon}</span>}
      {inputEl}
      {trailingIcon && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-subtle">{trailingIcon}</span>}
    </div>
  );
}
