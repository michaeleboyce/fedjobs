// apps/web/app/features/jobs/components/JobBoard/JobFilter.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { type JobSearchParams } from '../../types';
import { Input } from '../../../../shared/components/ui/Input';
import { Select } from '../../../../shared/components/ui/Select';
import { Button } from '../../../../shared/components/ui/Button';
import { Icon } from '../../../../shared/components/ui/Icon';
import { useDebouncedCallback } from 'use-debounce';

interface JobFilterProps {
  onSearch: (params: JobSearchParams) => void;
  initialValues?: JobSearchParams;
}

export default function JobFilter({ onSearch, initialValues = {} }: JobFilterProps) {
  const [filters, setFilters] = useState<JobSearchParams>({
    keywords: '',
    location: '',
    organization: '',
    organizationType: '',
    employmentType: '',
    ...initialValues
  });

  const [isAdvanced, setIsAdvanced] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Load search history from localStorage on initial render
  useEffect(() => {
    const savedHistory = localStorage.getItem('jobSearchHistory');
    if (savedHistory) {
      try {
        const parsedHistory = JSON.parse(savedHistory);
        if (Array.isArray(parsedHistory)) {
          setSearchHistory(parsedHistory);
        }
      } catch (error) {
        console.error('Error parsing search history:', error);
      }
    }
  }, []);

  // Update filters when initialValues change
  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      ...initialValues
    }));
  }, [initialValues]);

  // Generate search suggestions based on input and history
  const generateSuggestions = useCallback((input: string) => {
    if (!input) {
      setSuggestions([]);
      return;
    }
    
    const inputLower = input.toLowerCase();
    
    // Get suggestions from search history
    const historyMatches = searchHistory
      .filter(term => term.toLowerCase().includes(inputLower))
      .slice(0, 3);
    
    // Common job skills and terms for suggestions
    const commonTerms = [
      'Developer', 'Engineer', 'Manager', 'Director', 'Coordinator',
      'JavaScript', 'Python', 'React', 'TypeScript', 'Angular', 'Vue',
      'Full Stack', 'Frontend', 'Backend', 'DevOps', 'UI/UX',
      'Project Manager', 'Product Manager', 'Data Scientist', 'Data Analyst',
      'Remote', 'Hybrid', 'Entry Level', 'Senior', 'Junior', 'Lead',
      'Federal', 'Government', 'Contractor', 'Security Clearance'
    ];
    
    // Get suggestions from common terms
    const termMatches = commonTerms
      .filter(term => term.toLowerCase().includes(inputLower))
      .slice(0, 5);
    
    // Combine and remove duplicates
    const allSuggestions = [...new Set([...historyMatches, ...termMatches])];
    
    setSuggestions(allSuggestions.slice(0, 5));
  }, [searchHistory]);
  
  // Debounced handler for keyword change to prevent excessive suggestions generation
  const debouncedHandleSuggestions = useDebouncedCallback((value: string) => {
    generateSuggestions(value);
  }, 300);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    setFilters(prev => ({ ...prev, [name]: value }));
    
    // Generate suggestions for keywords field
    if (name === 'keywords') {
      debouncedHandleSuggestions(value);
      setShowSuggestions(!!value);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Save keyword to search history if it's not empty and not already in history
    if (filters.keywords && !searchHistory.includes(filters.keywords)) {
      const newHistory = [filters.keywords, ...searchHistory].slice(0, 10);
      setSearchHistory(newHistory);
      localStorage.setItem('jobSearchHistory', JSON.stringify(newHistory));
    }
    
    // Close suggestions
    setShowSuggestions(false);
    
    // Perform search
    onSearch(filters);
  };

  const handleReset = () => {
    const emptyFilters = {
      keywords: '',
      location: '',
      organization: '',
      organizationType: '',
      employmentType: ''
    };
    setFilters(emptyFilters);
    setShowSuggestions(false);
    onSearch(emptyFilters);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setFilters(prev => ({ ...prev, keywords: suggestion }));
    setShowSuggestions(false);
    
    // Immediately search with the suggestion
    onSearch({
      ...filters,
      keywords: suggestion
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 p-4 rounded-md mb-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Keywords field with suggestions */}
        <div className="relative">
          <label htmlFor="keywords" className="block text-sm font-medium text-gray-700 mb-1">
            Keywords
          </label>
          <div className="relative">
            <Input
              id="keywords"
              name="keywords"
              value={filters.keywords || ''}
              onChange={handleChange}
              placeholder="Job title, skills, etc."
              autoComplete="off"
              onFocus={() => filters.keywords && setShowSuggestions(true)}
              onBlur={() => {
                // Delayed hide of suggestions to allow clicking them
                setTimeout(() => setShowSuggestions(false), 150);
              }}
              rightIcon={
                filters.keywords ? 
                <span onClick={() => {
                  setFilters(prev => ({ ...prev, keywords: '' }));
                  setSuggestions([]);
                }}>×</span> : 
                <Icon name="search" size="sm" />
              }
            />
            
            {/* Suggestions dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                <ul className="py-1">
                  {suggestions.map((suggestion, index) => (
                    <li 
                      key={index}
                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm flex items-center"
                      onClick={() => handleSuggestionClick(suggestion)}
                    >
                      <Icon name="search" size="xs" className="mr-2 text-gray-400" />
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          {searchHistory.length > 0 && filters.keywords === '' && (
            <div className="mt-1 flex flex-wrap gap-1">
              <span className="text-xs text-gray-500">Recent:</span>
              {searchHistory.slice(0, 3).map((term, index) => (
                <button
                  key={index}
                  type="button"
                  className="text-xs bg-gray-200 hover:bg-gray-300 rounded px-2 py-0.5 transition-colors"
                  onClick={() => handleSuggestionClick(term)}
                >
                  {term}
                </button>
              ))}
            </div>
          )}
        </div>
        
        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
            Location
          </label>
          <Input
            id="location"
            name="location"
            value={filters.location || ''}
            onChange={handleChange}
            placeholder="City, state, remote, etc."
          />
        </div>
        
        <div>
          <label htmlFor="organization" className="block text-sm font-medium text-gray-700 mb-1">
            Organization
          </label>
          <Input
            id="organization"
            name="organization"
            value={filters.organization || ''}
            onChange={handleChange}
            placeholder="Company or organization name"
          />
        </div>
        
        {/* Advanced filters toggle */}
        {!isAdvanced ? (
          <div className="flex items-end col-span-full">
            <Button type="submit" className="mr-2">
              Search
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleReset}
              className="mr-2"
            >
              Reset
            </Button>
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => setIsAdvanced(true)}
              className="text-sm"
            >
              Advanced Search
            </Button>
          </div>
        ) : (
          <>
            {/* Advanced filter options */}
            <div>
              <label htmlFor="organizationType" className="block text-sm font-medium text-gray-700 mb-1">
                Organization Type
              </label>
              <Select
                id="organizationType"
                name="organizationType"
                value={filters.organizationType || ''}
                onChange={handleChange}
              >
                <option value="">Any</option>
                <option value="GOVERNMENT">Government</option>
                <option value="NONPROFIT">Nonprofit</option>
                <option value="PRIVATE">Private</option>
                <option value="PUBLIC">Public</option>
                <option value="ACADEMIC">Academic</option>
                <option value="STARTUP">Startup</option>
                <option value="OTHER">Other</option>
              </Select>
            </div>
            
            <div>
              <label htmlFor="employmentType" className="block text-sm font-medium text-gray-700 mb-1">
                Employment Type
              </label>
              <Select
                id="employmentType"
                name="employmentType"
                value={filters.employmentType || ''}
                onChange={handleChange}
              >
                <option value="">Any</option>
                <option value="FULL_TIME">Full Time</option>
                <option value="PART_TIME">Part Time</option>
                <option value="CONTRACT">Contract</option>
                <option value="TEMPORARY">Temporary</option>
                <option value="INTERNSHIP">Internship</option>
                <option value="REMOTE">Remote</option>
                <option value="HYBRID">Hybrid</option>
                <option value="OTHER">Other</option>
              </Select>
            </div>
            
            <div className="flex items-end col-span-full">
              <Button type="submit" className="mr-2">
                Search
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleReset}
                className="mr-2"
              >
                Reset
              </Button>
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setIsAdvanced(false)} 
                className="text-sm"
              >
                Simple Search
              </Button>
            </div>
          </>
        )}
      </div>
    </form>
  );
}