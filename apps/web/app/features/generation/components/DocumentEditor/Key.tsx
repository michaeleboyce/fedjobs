import React from 'react';

interface KeyProps {
  children: React.ReactNode;
}

export function Key({ children }: KeyProps) {
  return (
    <span className="inline-block px-2 py-1 min-w-8 text-center bg-gray-100 border border-gray-300 rounded text-sm font-mono">
      {children}
    </span>
  );
}