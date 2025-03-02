// File path: apps/web/app/shared/components/ui/Badge/index.tsx
'use client';

import React from 'react';
import { cn } from '@/app/shared/utils/classNames';

export type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
export type BadgeSize = 'sm' | 'md' | 'lg';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  className?: string;
  icon?: React.ReactNode;
  rounded?: boolean; // fully rounded or pill shape
}

/**
 * Badge component for status indicators and labels
 */
export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className,
  icon,
  rounded = false,
}) => {
  // Base styles that apply to all badges
  const baseStyles = 'inline-flex items-center font-medium';

  // Variant-specific colors
  const variantStyles = {
    default: 'bg-gray-100 text-gray-800',
    primary: 'bg-blue-100 text-blue-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    danger: 'bg-red-100 text-red-800',
    info: 'bg-indigo-100 text-indigo-800',
  };

  // Size-specific styles
  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-0.5',
    lg: 'text-base px-3 py-1',
  };

  // Border radius style based on rounded prop
  const borderStyles = rounded ? 'rounded-full' : 'rounded';

  return (
    <span
      className={cn(
        baseStyles,
        variantStyles[variant],
        sizeStyles[size],
        borderStyles,
        className
      )}
    >
      {icon && <span className="mr-1">{icon}</span>}
      {children}
    </span>
  );
};

export default Badge;