# FedJobs Web App Reorganization Plan

## Issues Identified

1. **Inconsistent Styling Approaches**:
   - Mix of direct Tailwind classes, custom CSS, and styled components
   - CSS duplication in globals.css
   - Missing standardized component styling patterns

2. **Inconsistent File Organization**:
   - Some components use folder structure with index.tsx, others use single files
   - Inconsistent casing in filenames (camelCase vs PascalCase)
   - Old file path comments referencing outdated directory structure

3. **State Management Inconsistencies**:
   - Mix of React Context, Zustand, and local component state
   - No clear separation of global vs local state concerns

4. **UI Component Structure**:
   - No standardized UI component library
   - Multiple icon libraries (FontAwesome and React Icons)
   - Inconsistent button styles and component props

5. **Code Structure Issues**:
   - Large components with mixed concerns
   - Duplicated logic across similar components

## Reorganization Plan

### 1. Standardize Style System

1. **Adopt Tailwind as Primary Styling**:
   - Create a consistent design token system with Tailwind
   - Define standard design tokens (colors, spacing, typography) in tailwind.config.ts
   - Remove duplicate CSS in globals.css

2. **Create Component Style System**:
   - Implement a UI component library based on Tailwind
   - Define standard component styles for buttons, cards, forms, etc.
   - Use `@apply` directives consistently and define component classes

3. **Standardize Icon Usage**:
   - Select one icon library (recommend React Icons) for consistency
   - Create wrapper components for icons to ensure consistent usage

### 2. Restructure File Organization

1. **Standardize Component Structure**:
   - Adopt a consistent component organization pattern:
     ```
     components/
       MyComponent/
         index.tsx        # Main component
         MyComponent.tsx  # Alternative to index.tsx 
         styles.ts        # Component-specific styles (if needed)
         types.ts         # Component-specific types
         utils.ts         # Component-specific utilities
     ```

2. **Standardize Naming Conventions**:
   - Use PascalCase for component files and folders
   - Use camelCase for utility files and hooks
   - Use kebab-case for CSS class names

3. **Update File Path Comments**:
   - Remove outdated file path comments
   - Add consistent file documentation headers

### 3. Unify State Management

1. **Transition to Zustand for Global State**:
   - Complete migration from Context API to Zustand
   - Split stores based on domains (positions, documents, generation)
   - Define clear boundaries between global and local state

2. **Standardize React Query Usage**:
   - Define consistent patterns for data fetching
   - Create custom hooks for data fetching operations
   - Implement proper error handling and loading states

### 4. Create Comprehensive UI Component Library

1. **Build Base Components**:
   - Create a set of base UI components in `app/shared/components/ui`
   - Include Button, Card, Input, Select, Modal, etc.
   - Ensure consistent props API across components

2. **Icon System**:
   - Create an Icon component that standardizes usage
   - Implement common icon patterns (with text, with buttons, etc.)

3. **Layout Components**:
   - Create standardized layout components
   - Implement consistent spacing and alignment

### 5. Code Structure Improvements

1. **Component Composition**:
   - Break large components into smaller, focused components
   - Use composition to build complex UI from simpler parts

2. **Custom Hooks**:
   - Extract complex logic into custom hooks
   - Ensure hooks follow React's naming conventions

3. **Performance Optimization**:
   - Add memoization for expensive computations
   - Implement proper list virtualization for large data sets

### 6. Routing and Navigation

1. **Standardize Route Structure**:
   - Organize routes with a consistent pattern
   - Implement proper route guards and authorization checks
   - Create standardized layouts for different sections

2. **Navigation Components**:
   - Create reusable navigation components (Sidebar, Header, Breadcrumbs)
   - Implement active state tracking for navigation items
   - Ensure mobile responsiveness for all navigation components

3. **Lazy Loading**:
   - Implement route-based code splitting
   - Add suspense boundaries for asynchronous routes
   - Create standardized loading states for route transitions

### 7. Form Management

1. **Standardize Form Components**:
   - Create a library of form components (Input, Select, Checkbox, etc.)
   - Implement consistent validation patterns
   - Create reusable form layouts and field groups

2. **Form State Management**:
   - Adopt React Hook Form for form state
   - Create custom hooks for common form patterns
   - Implement field-level validation with error messages

3. **Submission Handling**:
   - Standardize form submission with loading and error states
   - Create reusable submission handlers
   - Implement toast notifications for form actions

## Implementation Plan

### Phase 1: Style Standardization (✅ In Progress)
1. Clean up globals.css and define Tailwind design tokens
2. Create base UI component library
3. Create style guidelines documentation

### Phase 2: File Reorganization
1. Standardize component structure
2. Update naming conventions
3. Clean up file path comments

### Phase 3: State Management (✅ In Progress)
1. Complete Zustand migration
2. Standardize data fetching with React Query

### Phase 4: Component Library (✅ In Progress)
1. Implement base UI components 
   - ✅ Button
   - ✅ Input
   - 🔄 Card
   - 🔄 Icon
   - ⬜ Modal
   - ⬜ Dropdown/Menu
   - ⬜ Toast notifications
2. Create component documentation

### Phase 5: Form Management (🔄 Started)
1. Create standardized form components
   - ✅ Input
   - ✅ Button
   - 🔄 Select
   - 🔄 Checkbox
   - 🔄 Textarea
   - 🔄 Form wrapper
2. Implement form validation with React Hook Form
3. Create reusable form layouts
4. Add schema validation with Zod

### Phase 6: Navigation and Routing
1. Reorganize route structure
2. Create standardized navigation components
   - ⬜ Navbar
   - ⬜ Sidebar
   - ⬜ Breadcrumbs
   - ⬜ Tabs
3. Implement lazy loading

### Phase 7: Code Refactoring
1. Refactor large components
2. Extract and standardize common logic
3. Implement performance optimizations

## Current Progress

### Base Component Implementation
- **Button**: ✅ Fully implemented with variants, sizes, and icons
- **Input**: ✅ Fully implemented with error states, helper text, and icons
- **Form**: 🔄 In progress - creating standardized form components and validation
- **Card**: 🔄 In progress - creating flexible card components with headers, footers
- **Select**: 🔄 In progress - creating consistent dropdown experience

### Next Steps (Short-term)
1. Complete Form component implementation with proper validation
2. Implement Select, Checkbox, and Textarea components
3. Create form example documentation in storybook format
4. Start implementing navigation components for consistent layout

## Style Guide

### Component Structure
```tsx
// Component/index.tsx
import React from 'react';
import { ComponentProps } from './types';
import { useComponentLogic } from './hooks';
import { cn } from '@/app/shared/utils/classNames';

export const Component: React.FC<ComponentProps> = ({ 
  className,
  // other props 
}) => {
  // Component implementation
  
  return (
    <div className={cn('base-styles', className)}>
      {/* Component content */}
    </div>
  );
};
```

### Button Component Example
```tsx
// Button/index.tsx
import React from 'react';
import { cn } from '@/app/shared/utils/classNames';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  disabled,
  ...props
}) => {
  const baseStyles = 'font-medium rounded focus:outline-none focus:ring-2 transition-colors';
  
  const variantStyles = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-300',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-200',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-300',
    ghost: 'bg-transparent hover:bg-gray-100 focus:ring-gray-200',
  };
  
  const sizeStyles = {
    sm: 'py-1 px-2 text-sm',
    md: 'py-2 px-4 text-base',
    lg: 'py-3 px-6 text-lg',
  };
  
  const isDisabled = disabled || isLoading;
  
  return (
    <button
      className={cn(
        baseStyles,
        variantStyles[variant],
        sizeStyles[size],
        isDisabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      disabled={isDisabled}
      {...props}
    >
      {isLoading && (
        <span className="mr-2">
          {/* Loading spinner icon */}
        </span>
      )}
      {leftIcon && <span className="mr-2">{leftIcon}</span>}
      {children}
      {rightIcon && <span className="ml-2">{rightIcon}</span>}
    </button>
  );
};
```

### Form Component Example
```tsx
// Input/index.tsx
import React from 'react';
import { cn } from '@/app/shared/utils/classNames';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  className,
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  id,
  ...props
}) => {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
  
  return (
    <div className="w-full">
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
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            {leftIcon}
          </div>
        )}
        
        <input
          id={inputId}
          className={cn(
            'w-full rounded-md border shadow-sm focus:ring-2 focus:ring-blue-300 focus:border-blue-300 transition-colors',
            leftIcon ? 'pl-10' : 'pl-3',
            rightIcon ? 'pr-10' : 'pr-3',
            error ? 'border-red-300 text-red-900 focus:ring-red-300 focus:border-red-300' : 'border-gray-300',
            'py-2',
            className
          )}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
          {...props}
        />
        
        {rightIcon && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
            {rightIcon}
          </div>
        )}
      </div>
      
      {error && (
        <p id={`${inputId}-error`} className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
      
      {helperText && !error && (
        <p id={`${inputId}-helper`} className="mt-1 text-sm text-gray-500">
          {helperText}
        </p>
      )}
    </div>
  );
};
```

This plan provides a comprehensive approach to reorganizing the FedJobs web application to ensure consistency in style, structure, and maintainability.