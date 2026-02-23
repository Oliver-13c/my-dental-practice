import React from 'react';

interface ProvidersProps {
  children: React.ReactNode;
}

// Minimal server-renderable Providers wrapper. Keep side-effect free so it can be used as a server component.
export default function Providers({ children }: ProvidersProps) {
  return <>{children}</>;
}
