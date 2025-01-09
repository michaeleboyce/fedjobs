// File path: apps/web/app/_components/SearchBar.tsx
import React from "react";

interface SearchBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({ searchTerm, onSearchChange }) => (
  <div className="mb-6">
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
