// File path: apps/web/app/features/jobs/components/JobBoard/JobFilter.tsx
// apps/web/app/features/jobs/components/JobBoard/JobFilter.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { type JobSearchParams } from '../../types';
import { Input } from '../../../../shared/components/ui/Input';
import { Select } from '../../../../shared/components/ui/Select';
import { Button } from '../../../../shared/components/ui/Button';

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

  // Update filters when initialValues change
  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      ...initialValues
    }));
  }, [initialValues]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
    onSearch(emptyFilters);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 p-4 rounded-md mb-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <div>
          <label htmlFor="keywords" className="block text-sm font-medium text-gray-700 mb-1">
            Keywords
          </label>
          <Input
            id="keywords"
            name="keywords"
            value={filters.keywords || ''}
            onChange={handleChange}
            placeholder="Job title, skills, etc."
          />
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
        
        <div className="flex items-end space-x-2">
          <Button type="submit">
            Search
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleReset}
          >
            Reset
          </Button>
        </div>
      </div>
    </form>
  );
}