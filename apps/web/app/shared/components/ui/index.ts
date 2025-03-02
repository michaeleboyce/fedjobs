/**
 * UI Component Library
 * 
 * This exports a comprehensive set of UI components that follow consistent 
 * styling patterns and behavior throughout the application.
 */

// Base components
export { default as Button } from './Button';
export { default as Card } from './Card';
export { default as Icon } from './Icon';
export { default as Input } from './Input';
export { default as Badge } from './Badge';

// Form components
export { default as Select } from './Select';
export { default as Checkbox } from './Checkbox';
export { default as Textarea } from './Textarea';

// Export types for better developer experience
// Base component types
export type { ButtonProps, ButtonVariant, ButtonSize } from './Button';
export type { CardProps, CardHeaderProps, CardContentProps, CardFooterProps } from './Card';
export type { IconName, IconSize, IconProps } from './Icon';
export type { InputProps } from './Input';
export type { BadgeProps, BadgeVariant, BadgeSize } from './Badge';

// Form component types
export type { SelectProps, SelectOption } from './Select';
export type { CheckboxProps } from './Checkbox';
export type { TextareaProps } from './Textarea';