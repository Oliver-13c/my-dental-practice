import React from 'react';

export function AsyncState<T>({
  loading,
  error,
  data,
  isEmpty,
  loadingFallback,
  emptyFallback,
  errorFallback,
  children,
}: {
  loading: boolean;
  error?: string | null;
  data?: T;
  isEmpty: (data: T | undefined) => boolean;
  loadingFallback?: React.ReactNode;
  emptyFallback?: React.ReactNode;
  errorFallback?: (error: string) => React.ReactNode;
  children: (data: T) => React.ReactNode;
}) {
  if (loading) {
    return <>{loadingFallback ?? null}</>;
  }

  if (error) {
    return <>{errorFallback ? errorFallback(error) : null}</>;
  }

  if (isEmpty(data)) {
    return <>{emptyFallback ?? null}</>;
  }

  return <>{children(data as T)}</>;
}
