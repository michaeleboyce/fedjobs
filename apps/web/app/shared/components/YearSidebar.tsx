'use client';

import React, { useEffect, useState } from "react";
import { cn } from '@/app/shared/utils/classNames';

interface YearSidebarProps {
  years: (number | string)[]; // Accept years and "No Date"
  prefix: string;
  parentId: string;
  className?: string;
  headerOffset?: number; // New prop
}

/**
 * YearSidebar component displays a vertical navigation for year-based content
 * with active state highlighting based on scroll position
 */
export const YearSidebar: React.FC<YearSidebarProps> = ({
  years,
  prefix,
  parentId,
  className,
  headerOffset = 80, // Default value
}) => {
  const [activeYear, setActiveYear] = useState<number | string | null>(null);

  // Track visible years as user scrolls
  useEffect(() => {
    // Make sure the DOM is ready
    const parent = document.getElementById(parentId);
    if (!parent) return;

    // Function to determine which year is currently visible
    const updateActiveYear = () => {
      
      const parent = document.getElementById(parentId);
      if (!parent) return;
    
      const yearElements = years
        .map(year => document.getElementById(`${prefix}${year}`))
        .filter((el): el is HTMLElement => el !== null);
    
      if (yearElements.length === 0) return;

      
      const parentRect = parent.getBoundingClientRect();
      
      // Find the first element that is at or above the top of the container
      let activeEl = yearElements.find(el => el.getBoundingClientRect().top >= parentRect.top);
    
      if (!activeEl) {
        // If none are above the top, take the last visible one
        activeEl = yearElements[yearElements.length - 1];
      }
    
      if (activeEl) {
        const yearStr = activeEl.id.replace(prefix, '');
        const parsedYear = parseInt(yearStr);
        setActiveYear(isNaN(parsedYear) ? yearStr : parsedYear);
      }

      console.log(yearElements.map(el => ({
        id: el.id,
        top: el.getBoundingClientRect().top,
      })));
    };
    // Add scroll event listener
    parent.addEventListener('scroll', updateActiveYear);
    
    // Initial update
    updateActiveYear();

    return () => {
      parent.removeEventListener('scroll', updateActiveYear);
    };
  }, [years, prefix, parentId]);

  // Handle click on a year link
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, year: number | string) => {
    e.preventDefault();
    
    const parent = document.getElementById(parentId);
    const target = document.getElementById(`${prefix}${year}`);
  
    if (!parent || !target) return;
  
    // Get the target position relative to the parent
    const targetRect = target.getBoundingClientRect();
    const parentRect = parent.getBoundingClientRect();
  
    // Use the provided headerOffset for this specific section
    const targetScrollTop = parent.scrollTop + (targetRect.top - parentRect.top) - headerOffset;
  
    parent.scrollTo({
      top: targetScrollTop,
      behavior: 'smooth',
    });
  
    setActiveYear(year);
  };
  
  return (
    <nav className={cn("space-y-1 ml-[-1px]", className)}>
      {years.map((year) => (
        <a
          key={year}
          href={`#${prefix}${year}`}
          onClick={(e) => handleClick(e, year)}
          className={cn(
            "relative block pl-4 py-1 text-sm transition-colors",
            "before:absolute before:left-0 before:top-0 before:h-full before:transition-all",
            activeYear === year 
              ? "text-blue-600 before:w-0.5 before:bg-blue-600" 
              : "text-gray-600 before:w-0 hover:text-blue-600 hover:before:w-0.5 hover:before:bg-blue-600"
          )}
        >
          {String(year)}
        </a>
      ))}
    </nav>
  );
};