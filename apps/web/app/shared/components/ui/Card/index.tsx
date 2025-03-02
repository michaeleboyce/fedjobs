'use client';

import React from 'react';
import { cn } from '@/app/shared/utils/classNames';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  interactive?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  bordered?: boolean;
  elevated?: boolean;
}

/**
 * Card component for consistent content containers throughout the app
 */
export const Card: React.FC<CardProps> = ({
  children,
  className,
  onClick,
  interactive = false,
  padding = 'md',
  bordered = true,
  elevated = false,
}) => {
  const paddingMap = {
    none: 'p-0',
    sm: 'p-2',
    md: 'p-4',
    lg: 'p-6',
  };

  return (
    <div
      className={cn(
        'bg-white rounded-lg',
        paddingMap[padding],
        bordered && 'border border-gray-200',
        elevated && 'shadow-md',
        interactive && 'transition-all hover:shadow-md cursor-pointer',
        className
      )}
      onClick={interactive ? onClick : undefined}
    >
      {children}
    </div>
  );
};

export interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
}

/**
 * Card header component for consistent card headers
 */
export const CardHeader: React.FC<CardHeaderProps> = ({ 
  children, 
  className,
  actions
}) => {
  return (
    <div className={cn('flex items-center justify-between mb-4', className)}>
      <div className="font-semibold text-lg">{children}</div>
      {actions && <div className="flex items-center space-x-2">{actions}</div>}
    </div>
  );
};

export interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Card content component for consistent card content
 */
export const CardContent: React.FC<CardContentProps> = ({ 
  children, 
  className 
}) => {
  return <div className={className}>{children}</div>;
};

export interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Card footer component for consistent card footers
 */
export const CardFooter: React.FC<CardFooterProps> = ({ 
  children, 
  className 
}) => {
  return (
    <div className={cn('flex items-center justify-between mt-4 pt-4 border-t border-gray-100', className)}>
      {children}
    </div>
  );
};

export default Object.assign(Card, {
  Header: CardHeader,
  Content: CardContent,
  Footer: CardFooter,
});