// File path: apps/web/app/shared/components/ui/Textarea/index.tsx
'use client';

import React, { forwardRef, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/app/shared/utils/classNames';
import Icon from '../Icon';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string;
  fullWidth?: boolean;
  autoResize?: boolean;
  minRows?: number;
  maxRows?: number;
}

/**
 * Textarea component for consistent multi-line form fields
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ 
    className,
    label,
    helperText,
    error,
    fullWidth = false,
    autoResize = false,
    minRows = 3,
    maxRows = 8,
    id,
    disabled,
    onChange,
    ...props 
  }, ref) => {
    // Internal ref used for auto-resize functionality
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    
    // Combine the forwarded ref with our internal ref
    const setRefs = useCallback((element: HTMLTextAreaElement | null) => {
      // Update the internal ref
      textareaRef.current = element;
      
      // Forward the ref
      if (typeof ref === 'function') {
        ref(element);
      } else if (ref) {
        ref.current = element;
      }
    }, [ref]);
    
    // Calculate the line height for auto-resize
    const calculateLineHeight = useCallback(() => {
      if (!textareaRef.current) return 20; // Default fallback
      
      const styles = window.getComputedStyle(textareaRef.current);
      return parseInt(styles.lineHeight, 10) || 20;
    }, []);
    
    // Auto-resize functionality
    const autoResizeTextarea = useCallback(() => {
      if (!textareaRef.current || !autoResize) return;
      
      const textarea = textareaRef.current;
      const lineHeight = calculateLineHeight();
      
      // Reset height to auto to get the actual scrollHeight
      textarea.style.height = 'auto';
      
      // Calculate the new height
      const minHeight = minRows * lineHeight;
      const maxHeight = maxRows * lineHeight;
      const newHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight);
      
      textarea.style.height = `${newHeight}px`;
      
      // Add overflow if content exceeds max height
      textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
    }, [autoResize, calculateLineHeight, minRows, maxRows]);
    
    // Handle change event with auto-resize
    const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (onChange) {
        onChange(e);
      }
      
      if (autoResize) {
        autoResizeTextarea();
      }
    }, [onChange, autoResize, autoResizeTextarea]);
    
    // Initialize auto-resize on mount and when content changes
    useEffect(() => {
      if (autoResize && textareaRef.current) {
        autoResizeTextarea();
      }
    }, [autoResize, props.value, props.defaultValue, autoResizeTextarea]);
    
    // Generate a random ID if none is provided
    const textareaId = id || `textarea-${Math.random().toString(36).substring(2, 9)}`;
    
    return (
      <div className={cn('relative', fullWidth && 'w-full', className)}>
        {label && (
          <label 
            htmlFor={textareaId}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {label}
          </label>
        )}
        
        <textarea
          ref={setRefs}
          id={textareaId}
          className={cn(
            'block rounded-md shadow-sm border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50',
            error && 'border-red-300 focus:border-red-500 focus:ring-red-500',
            disabled && 'bg-gray-100 cursor-not-allowed opacity-75',
            fullWidth && 'w-full',
            !autoResize && 'resize-y',
            autoResize && 'resize-none overflow-hidden'
          )}
          disabled={disabled}
          onChange={handleChange}
          aria-invalid={!!error}
          aria-describedby={error ? `${textareaId}-error` : helperText ? `${textareaId}-helper` : undefined}
          rows={autoResize ? minRows : props.rows}
          {...props}
        />
        
        {error && (
          <p 
            id={`${textareaId}-error`}
            className="mt-1 text-sm text-red-600 flex items-center"
          >
            <Icon name="alert" size="sm" className="mr-1" color="#DC2626" />
            {error}
          </p>
        )}
        
        {!error && helperText && (
          <p 
            id={`${textareaId}-helper`}
            className="mt-1 text-sm text-gray-500"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export default Textarea;