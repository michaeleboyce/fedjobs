'use client';

import React, { useEffect, useState, useRef } from "react";
import { cn } from '@/app/shared/utils/classNames';

interface YearSidebarProps {
  years: (number | string)[]; // Accept years and "No Date"
  prefix: string;
  parentId: string;
  className?: string;
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
}) => {
  const [activeYear, setActiveYear] = useState<number | string | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const [yearElements, setYearElements] = useState<HTMLElement[]>([]);

  // Set up intersection observer for tracking which year section is visible
  useEffect(() => {
    // First get all the year elements
    const elements = years
      .map(year => document.getElementById(`${prefix}${year}`))
      .filter((el): el is HTMLElement => el !== null);
    
    setYearElements(elements);

    if (elements.length === 0) return;

    // Create an intersection observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        // First check if any entries are intersecting
        const visibleEntries = entries.filter(entry => entry.isIntersecting);
        
        if (visibleEntries.length > 0) {
          // Sort entries by their position in the viewport (top to bottom)
          visibleEntries.sort((a, b) => {
            const rectA = a.boundingClientRect;
            const rectB = b.boundingClientRect;
            return rectA.top - rectB.top;
          });
          
          // Select the top-most visible year section
          const topEntry = visibleEntries[0];
          
          // Get the year from the element ID
          const yearStr = topEntry.target.id.replace(prefix, '');
          const parsedYear = parseInt(yearStr);
          setActiveYear(isNaN(parsedYear) ? yearStr : parsedYear);
        }
      },
      {
        root: document.getElementById(parentId), // Observe within the parent element
        rootMargin: '0px 0px -80% 0px', // Focus on the top 20% of the viewport
        threshold: [0, 0.1] // Low thresholds to detect when section enters viewport
      }
    );
    
    // Observe all year elements
    elements.forEach(el => {
      observerRef.current?.observe(el);
    });
    
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [years, prefix, parentId]);
  
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, year: number | string) => {
    e.preventDefault();
    const target = document.getElementById(`${prefix}${year}`);
    const parent = document.getElementById(parentId);
    
    if (target && parent) {
      // Find the first position element within this year section
      const firstPositionElement = target.querySelector('[data-position-element="true"]');
      
      // Calculate scroll position (either to the year header or first position)
      const targetPosition = firstPositionElement 
        ? (firstPositionElement as HTMLElement).offsetTop 
        : target.offsetTop;
        
      const headerHeight = 85; // Estimated height of sticky headers + year header + spacing
      
      // Scroll the parent container
      parent.scrollTo({
        top: targetPosition - headerHeight,
        behavior: 'smooth'
      });
      
      // Update active year immediately for a responsive feel
      setActiveYear(year);
    }
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
