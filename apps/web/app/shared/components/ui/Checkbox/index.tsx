'use client';

import React, { forwardRef } from 'react';
import { cn } from '@/app/shared/utils/classNames';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  helperText?: string;
  error?: string;
  indeterminate?: boolean;
}

/**
 * Checkbox component for consistent checkbox form fields
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ 
    className,
    label,
    helperText,
    error,
    indeterminate = false,
    id,
    disabled,
    ...props 
  }, ref) => {
    // Handle the indeterminate state
    const internalRef = React.useRef<HTMLInputElement | null>(null);
    
    // Combine the forwarded ref with our internal ref
    const setRefs = (element: HTMLInputElement | null) => {
      // Update the internal ref
      internalRef.current = element;
      
      // Forward the ref
      if (typeof ref === 'function') {
        ref(element);
      } else if (ref) {
        ref.current = element;
      }
    };
    
    // Set indeterminate property which is not available as a React prop
    React.useEffect(() => {
      if (internalRef.current) {
        internalRef.current.indeterminate = indeterminate;
      }
    }, [indeterminate]);
    
    // Generate a random ID if none is provided
    const checkboxId = id || `checkbox-${Math.random().toString(36).substring(2, 9)}`;
    
    return (
      <div className={cn('relative', className)}>
        <div className="flex items-start">
          <div className="flex items-center h-5">
            <input
              ref={setRefs}
              id={checkboxId}
              type="checkbox"
              className={cn(
                'h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500',
                error && 'border-red-300',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
              disabled={disabled}
              aria-invalid={!!error}
              aria-describedby={error ? `${checkboxId}-error` : helperText ? `${checkboxId}-helper` : undefined}
              {...props}
            />
          </div>
          
          {label && (
            <div className="ml-3 text-sm">
              <label 
                htmlFor={checkboxId}
                className={cn(
                  'font-medium text-gray-700',
                  disabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                {label}
              </label>
            </div>
          )}
        </div>
        
        {error && (
          <p 
            id={`${checkboxId}-error`}
            className="mt-1 text-sm text-red-600"
          >
            {error}
          </p>
        )}
        
        {!error && helperText && (
          <p 
            id={`${checkboxId}-helper`}
            className="mt-1 text-sm text-gray-500 ml-7" // Align with the label
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export default Checkbox;