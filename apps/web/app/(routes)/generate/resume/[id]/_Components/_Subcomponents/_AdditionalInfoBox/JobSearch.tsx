import { searchUSAJobsAPI } from '@/app/_actions/usaJobsActions';
import { Job } from '@/app/_types/Job';
import { formatDateMMDDYYYY } from '@/app/_utils/DateUtils';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExternalLinkAlt } from '@fortawesome/free-solid-svg-icons';

import React, { useState, useEffect } from 'react';
import { useGenerationContext } from '../../../_Providers/GenerationProvider';
  // Define the props for JobSearch
  interface JobSearchProps {
  }
  export const JobSearch: React.FC= ({  }) => {
    const { setJob } = useGenerationContext();
    const [inputValue, setInputValue] = useState('');
    const [fetchQuery, setFetchQuery] = useState('');
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const [selectedJob, setSelectedJob] = useState<Job | null>(null);

    useEffect(() => {
      const fetchData = async () => {
        if (fetchQuery.length > 2) {
          setLoading(true);
          try {
            const fetchedJobs = await searchUSAJobsAPI(fetchQuery);
            setJobs(fetchedJobs);
            setShowDropdown(true);
          } catch (error) {
            console.error('Error fetching jobs:', error);
          } finally {
            setLoading(false);
          }
        }
      };
  
      fetchData();
    }, [fetchQuery]);
  
    const handleJobSelect = (job: Job) => {
        setSelectedJob(job);
        setJob(job);
        setShowDropdown(false);
    };
  
    const handleDeleteSelectedJob = () => {
        setSelectedJob(null);
        setInputValue('');
        setFetchQuery('');
      };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value);
      setFetchQuery(e.target.value);
    };
  
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown" && highlightedIndex < jobs.length - 1) {
        setHighlightedIndex(highlightedIndex + 1);
      } else if (e.key === "ArrowUp" && highlightedIndex > 0) {
        setHighlightedIndex(highlightedIndex - 1);
      } else if (e.key === "Enter" && jobs[highlightedIndex]) {
        handleJobSelect(jobs[highlightedIndex]);
        e.preventDefault();  // Prevents the form from being submitted
      }
    };

    const isClosingSoon = (closingDate: string) => {
        const now = new Date();
        const closing = new Date(closingDate);
        const fortyEightHours = 48 * 60 * 60 * 1000; // 48 hours in milliseconds
        return closing.getTime() - now.getTime() < fortyEightHours;
      };
      
    const formatJobDetails = (job: Job, isDropDown: boolean) => {
        const details = job.MatchedObjectDescriptor;
        const gradeRange = details.UserArea.Details.LowGrade === details.UserArea.Details.HighGrade 
                        ? details.UserArea.Details.LowGrade 
                        : `${details.UserArea.Details.LowGrade}-${details.UserArea.Details.HighGrade}`;
        const grade = (job.MatchedObjectDescriptor.JobGrade?.[0].Code ?? '') + ' ' + gradeRange;
        const URI = job.MatchedObjectDescriptor.PositionURI;
        const closingDateIsSoon = isClosingSoon(details.PositionEndDate);

        return (
          <div className="'mb-4 space-y-1 text-left p-2 border border-gray-300 rounded-md">
            <div className="font-bold">{details.PositionTitle}</div>
            <div>{details.OrganizationName}</div>
            <div>{details.DepartmentName}</div>
            {details.PositionLocationDisplay && <div>Location: {details.PositionLocationDisplay}</div>}
            {details.UserArea.Details.SubAgencyName && <div>Subagency: {details.UserArea.Details.SubAgencyName}</div>}
            <div>Grade:  {grade} </div>
            <div >
                Open Period: <span className={`italic ${closingDateIsSoon ? 'text-red-600' : ''}`}>{formatDateMMDDYYYY(details.PositionStartDate)} - {formatDateMMDDYYYY(details.PositionEndDate)}</span>
            </div>            
            {isDropDown ? '' : 
            <a href={URI} target="_blank" rel="noopener noreferrer" className="flex items-center text-blue-600 hover:text-blue-800 underline">
                View Position
                <FontAwesomeIcon icon={faExternalLinkAlt} className="ml-1" />
            </a>
            }
          </div>
        );
      };
    return (
    <div className="relative w-full bg-white p-4 border border-gray-200 rounded-lg">
      {!selectedJob ? (
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Search for jobs"
          className="w-full text-base p-2 border border-gray-300 rounded-md"
        />
      ) : (
        <div className="flex items-center justify-between p-2 border border-gray-300 rounded-md">
        <div className="flex-grow">
          {formatJobDetails(selectedJob, false)}
        </div>
        <button 
          onClick={handleDeleteSelectedJob} 
          className="text-lg text-red-600 bg-gray-100 p-1 rounded-full border border-gray-300 hover:bg-gray-200 hover:border-red-600 ml-2">
          x
        </button>
      </div>
    
      )}
      {loading && <div className="mt-2">Loading...</div>}
      {showDropdown && !selectedJob && (
        <div className="absolute mt-1 w-full rounded-md bg-white shadow-lg z-10">
          {jobs.map((job, index) => (
            <div 
              key={index}
              className={`p-4 cursor-pointer hover:bg-gray-100 border-b border-gray-300 ${highlightedIndex === index ? 'bg-gray-200' : ''}`}
              onClick={() => handleJobSelect(job)}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              {formatJobDetails(job, true)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
  };
  