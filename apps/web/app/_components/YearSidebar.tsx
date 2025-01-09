// File path: apps/web/app/_components/YearSidebar.tsx
import React, { useEffect, useState } from "react";
import Scrollspy from "react-scrollspy";

interface YearSidebarProps {
  years: number[];
  prefix: string;
  parentId: string;
}

export const YearSidebar: React.FC<YearSidebarProps> = ({ years, prefix, parentId }) => {
  const [activeYear, setActiveYear] = useState<number | null>(null);
  const ids = years.map(year => `${prefix}${year}`);

  useEffect(() => {
    const parent = document.getElementById(parentId);
    if (!parent) return;

    const handleScroll = () => {
      const yearElements = years.map(year => 
        document.getElementById(`${prefix}${year}`)
      ).filter((el): el is HTMLElement => el !== null);

      const parentRect = parent.getBoundingClientRect();
      const activeEl = yearElements.find(el => {
        const rect = el.getBoundingClientRect();
        return rect.top >= parentRect.top && rect.top <= (parentRect.top + parentRect.height / 2);
      });

      if (activeEl) {
        const year = Number(activeEl.id.replace(prefix, ''));
        setActiveYear(year);
      }
    };

    parent.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial check

    return () => parent.removeEventListener('scroll', handleScroll);
  }, [years, prefix, parentId]);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, year: number) => {
    e.preventDefault();
    const target = document.getElementById(`${prefix}${year}`);
    const parent = document.getElementById(parentId);
    if (target && parent) {
      const parentRect = parent.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const offset = targetRect.top - parentRect.top;
      parent.scrollBy({ top: offset - 20, behavior: 'smooth' });
    }
  };

  return (
    <nav className="space-y-1 ml-[-1px]">
      {years.map(year => (
        <a 
          key={year}
          href={`#${prefix}${year}`}
          onClick={(e) => handleClick(e, year)}
          className={`
            relative block pl-4 py-1 text-sm 
            ${activeYear === year ? 'text-blue-600 before:w-0.5 before:bg-blue-600' : 'text-gray-600 before:w-0'} 
            hover:text-blue-600 transition-colors
            before:absolute before:left-0 before:top-0 before:h-full before:bg-transparent 
            hover:before:w-0.5 hover:before:bg-blue-600 before:transition-all
          `}
        >
          {year}
        </a>
      ))}
    </nav>
  );
};