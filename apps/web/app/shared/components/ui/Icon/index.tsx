// File path: apps/web/app/shared/components/ui/Icon/index.tsx
'use client';

import React from 'react';
import { IconType } from 'react-icons';
import { cn } from '@/app/shared/utils/classNames';

// Import common icons from react-icons
import { 
  FiCheck, FiX, FiPlus, FiMinus, 
  FiChevronDown, FiChevronUp, FiChevronLeft, FiChevronRight,
  FiSearch, FiEdit, FiTrash2, FiDownload, FiUpload, 
  FiSave, FiRefreshCw, FiAlertCircle, FiCheckCircle, FiInfo
} from 'react-icons/fi';

export type IconName = 
  | 'check' | 'x' | 'plus' | 'minus'
  | 'chevron-down' | 'chevron-up' | 'chevron-left' | 'chevron-right'
  | 'search' | 'edit' | 'trash' | 'download' | 'upload'
  | 'save' | 'refresh' | 'alert' | 'success' | 'info';

export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface IconProps {
  name: IconName;
  size?: IconSize;
  className?: string;
  color?: string;
  onClick?: () => void;
}

// Map icon names to react-icons components
const iconMap: Record<IconName, IconType> = {
  'check': FiCheck,
  'x': FiX,
  'plus': FiPlus,
  'minus': FiMinus,
  'chevron-down': FiChevronDown,
  'chevron-up': FiChevronUp,
  'chevron-left': FiChevronLeft,
  'chevron-right': FiChevronRight,
  'search': FiSearch,
  'edit': FiEdit,
  'trash': FiTrash2,
  'download': FiDownload,
  'upload': FiUpload,
  'save': FiSave,
  'refresh': FiRefreshCw,
  'alert': FiAlertCircle,
  'success': FiCheckCircle,
  'info': FiInfo
};

// Map sizes to pixel values
const sizeMap: Record<IconSize, number> = {
  'xs': 12,
  'sm': 16,
  'md': 20,
  'lg': 24,
  'xl': 32
};

/**
 * Icon component that provides consistent icon usage throughout the app
 */
export const Icon: React.FC<IconProps> = ({ 
  name, 
  size = 'md', 
  className,
  color,
  onClick
}) => {
  const IconComponent = iconMap[name];
  
  if (!IconComponent) {
    console.error(`Icon "${name}" not found`);
    return null;
  }

  return (
    <span 
      className={cn(
        'inline-flex items-center justify-center',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      <IconComponent 
        size={sizeMap[size]} 
        color={color} 
      />
    </span>
  );
};

export default Icon;