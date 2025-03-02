// File path: apps/web/app/shared/components/SearchBar.tsx
import React from "react";
import { cn } from "@/app/shared/utils/classNames"; // Import the utility function

interface SearchBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  className?: string; // Add optional className prop
}

export const SearchBar: React.FC<SearchBarProps> = ({ 
  searchTerm, 
  onSearchChange, 
  className 
}) => (
  <div className={cn("mb-6", className)}>
    <input
      type="text"
      placeholder="Search positions..."
      value={searchTerm}
      onChange={(e) => onSearchChange(e.target.value)}
      className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      aria-label="Search positions"
    />
  </div>
);