'use client';

import React, { forwardRef } from 'react';
import { cn } from '@/app/shared/utils/classNames';
import Icon from '../Icon';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconClick?: () => void;
}

/**
 * Input component for consistent form fields throughout the app
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ 
    className,
    label,
    helperText,
    error,
    fullWidth = false,
    leftIcon,
    rightIcon,
    onRightIconClick,
    id,
    disabled,
    ...props 
  }, ref) => {
    // Generate a random ID if none is provided
    const inputId = id || `input-${Math.random().toString(36).substring(2, 9)}`;
    
    return (
      <div className={cn('relative', fullWidth && 'w-full', className)}>
        {label && (
          <label 
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {label}
          </label>
        )}
        
        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              {leftIcon}
            </div>
          )}
          
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'block w-full rounded-md shadow-sm border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50',
              leftIcon ? 'pl-10' : '',
              rightIcon ? 'pr-10' : '',
              error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : '',
              disabled ? 'bg-gray-100 cursor-not-allowed opacity-75' : '',
              fullWidth ? 'w-full' : ''
            )}
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
            {...props}
          />
          
          {rightIcon && (
            <div 
              className={cn(
                "absolute inset-y-0 right-0 flex items-center pr-3",
                onRightIconClick && "cursor-pointer"
              )}
              onClick={onRightIconClick}
            >
              {rightIcon}
            </div>
          )}
        </div>
        
        {error && (
          <p 
            id={`${inputId}-error`}
            className="mt-1 text-sm text-red-600 flex items-center"
          >
            <Icon name="alert" size="sm" className="mr-1" color="#DC2626" />
            {error}
          </p>
        )}
        
        {!error && helperText && (
          <p 
            id={`${inputId}-helper`}
            className="mt-1 text-sm text-gray-500"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;