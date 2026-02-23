import React from 'react';

export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <table className={`w-full border-collapse border border-gray-300 ${className || ''}`}>
      {children}
    </table>
  );
}

export function TableHead({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <thead className={`bg-gray-100 ${className || ''}`}>
      {children}
    </thead>
  );
}

export function TableHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`border border-gray-300 px-4 py-2 text-left font-semibold ${className || ''}`}>
      {children}
    </th>
  );
}

export function TableBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <tbody className={className || ''}>
      {children}
    </tbody>
  );
}

export function TableRow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <tr className={`hover:bg-gray-50 ${className || ''}`}>
      {children}
    </tr>
  );
}

export function TableCell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <td className={`border border-gray-300 px-4 py-2 ${className || ''}`}>
      {children}
    </td>
  );
}
