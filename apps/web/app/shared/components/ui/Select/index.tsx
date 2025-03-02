'use client';

import React, { forwardRef } from 'react';
import { cn } from '@/app/shared/utils/classNames';
import Icon from '../Icon';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onSelect'> {
  options: SelectOption[];
  label?: string;
  helperText?: string;
  error?: string;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  onSelect?: (value: string) => void;
}

/**
 * Select component for consistent dropdown form fields
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({
    className,
    options,
    label,
    helperText,
    error,
    fullWidth = false,
    leftIcon,
    onSelect,
    id,
    disabled,
    onChange,
    ...props
  }, ref) => {
    // Generate a random ID if none is provided
    const selectId = id || `select-${Math.random().toString(36).substring(2, 9)}`;
    
    // Handle onChange to call both the native onChange and our custom onSelect
    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      if (onChange) {
        onChange(e);
      }
      
      if (onSelect) {
        onSelect(e.target.value);
      }
    };
    
    return (
      <div className={cn('relative', fullWidth && 'w-full', className)}>
        {label && (
          <label 
            htmlFor={selectId}
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
          
          <select
            ref={ref}
            id={selectId}
            className={cn(
              'block w-full rounded-md shadow-sm border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50 appearance-none',
              // Fix type errors by ensuring string return values
              leftIcon ? 'pl-10' : '',
              error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : '',
              disabled ? 'bg-gray-100 cursor-not-allowed opacity-75' : '',
              fullWidth ? 'w-full' : ''
            )}
            disabled={disabled}
            onChange={handleChange}
            aria-invalid={!!error}
            aria-describedby={error ? `${selectId}-error` : helperText ? `${selectId}-helper` : undefined}
            {...props}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          
          <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
            <Icon name="chevron-down" size="sm" color="#6B7280" />
          </div>
        </div>
        
        {error && (
          <p 
            id={`${selectId}-error`}
            className="mt-1 text-sm text-red-600 flex items-center"
          >
            <Icon name="alert" size="sm" className="mr-1" color="#DC2626" />
            {error}
          </p>
        )}
        
        {!error && helperText && (
          <p 
            id={`${selectId}-helper`}
            className="mt-1 text-sm text-gray-500"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export default Select;