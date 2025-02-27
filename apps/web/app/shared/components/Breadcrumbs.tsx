// File path: apps/web/app/_components/Breadcrumbs.tsx
"use client";

import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

export const Breadcrumbs = () => {
  const pathname = usePathname();
  const pathWithoutQuery = pathname.split('?')[0]; // strip query params if any
  const pathSegments = pathWithoutQuery.split('/').filter(Boolean);

  const breadcrumbs = pathSegments.map((segment, index) => {
    const href = '/' + pathSegments.slice(0, index + 1).join('/');
    // Replace hyphens with spaces, then capitalize each word.
    const text = segment
      .replace(/-/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    return { href, text };
  });

  return (
    <nav aria-label="breadcrumb" className="my-4 px-4">
      <ol className="breadcrumb flex space-x-2">
        {/* Update Home breadcrumb to link to "/dashboard" */}
        <li key="home" className="breadcrumb-item">
          <Link href="/dashboard">Home</Link>
        </li>
        {breadcrumbs.map(({ href, text }, index) => (
          <li key={href} className="breadcrumb-item">
            {index === breadcrumbs.length - 1 ? (
              <span>{text}</span>
            ) : (
              <Link href={href}>{text}</Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};
