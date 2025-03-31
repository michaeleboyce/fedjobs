// apps/web/app/features/jobs/components/JobSourceManager/JobSourceForm.tsx
"use client";

import React, { useState } from 'react';
import { createJobSource } from '../../actions/jobSourceActions';
import { Button } from '../../../../shared/components/ui/Button';
import { Input } from '../../../../shared/components/ui/Input';
import { Select } from '../../../../shared/components/ui/Select';

interface JobSourceFormProps {
  userId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function JobSourceForm({ userId, onSuccess, onCancel }: JobSourceFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    keywords: '',
    refreshFrequency: 'DAILY'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simple validation
    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }
    
    if (!formData.url.trim()) {
      setError('URL is required');
      return;
    }
    
    // Basic URL validation
    try {
      new URL(formData.url);
    } catch (err) {
      setError('Please enter a valid URL (including https://)');
      return;
    }
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      await createJobSource({
        userId,
        name: formData.name,
        url: formData.url,
        keywords: formData.keywords,
        refreshFrequency: formData.refreshFrequency as 'DAILY' | 'WEEKLY' | 'MANUAL'
      });
      
      onSuccess();
    } catch (err) {
      console.error('Error creating job source:', err);
      setError('Failed to create job source. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-lg font-medium">Add Job Source</h3>
      
      {error && (
        <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}
      
      {/* Cache information notice */}
      <div className="p-3 bg-blue-50 text-blue-700 rounded-md text-sm mb-4">
        <p><strong>Pro Tip:</strong> Job sources are cached across all users.</p>
        <p className="text-xs mt-1">If another user has recently crawled the same URL, we'll use the cached data to save time and reduce load on job sites.</p>
      </div>
        
      <div className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Name
          </label>
          <Input
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="E.g., Company Career Page"
            required
          />
        </div>
        
        <div>
          <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">
            URL
          </label>
          <Input
            id="url"
            name="url"
            type="url"
            value={formData.url}
            onChange={handleChange}
            placeholder="https://company.com/careers"
            required
          />
          <p className="mt-1 text-xs text-gray-500">
            Enter the full URL to a job listing page (including https://)
          </p>
        </div>
        
        <div>
          <label htmlFor="keywords" className="block text-sm font-medium text-gray-700 mb-1">
            Keywords (Optional)
          </label>
          <Input
            id="keywords"
            name="keywords"
            value={formData.keywords}
            onChange={handleChange}
            placeholder="E.g., software developer, engineer"
          />
          <p className="mt-1 text-xs text-gray-500">
            Enter keywords to focus on specific job types, separated by commas
          </p>
        </div>
        
        <div>
          <label htmlFor="refreshFrequency" className="block text-sm font-medium text-gray-700 mb-1">
            Refresh Frequency
          </label>
          <Select
            id="refreshFrequency"
            name="refreshFrequency"
            value={formData.refreshFrequency}
            onChange={handleChange}
          >
            <option value="DAILY">Daily</option>
            <option value="WEEKLY">Weekly</option>
            <option value="MANUAL">Manual only</option>
          </Select>
        </div>
      </div>
      
      <div className="flex justify-end space-x-3 pt-2">
        <Button
          type="button"
          onClick={onCancel}
          variant="outline"
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Adding...' : 'Add Source'}
        </Button>
      </div>
    </form>
  );
}