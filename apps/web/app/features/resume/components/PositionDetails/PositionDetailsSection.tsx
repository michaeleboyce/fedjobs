// File path: apps/web/app/_components/Resume/components/PositionDetails/PositionDetailsSection.tsx
import React from 'react';
import { PositionObject } from '@/app/shared/types/Position';

/**
 * Props for the PositionDetails component
 */
interface PositionDetailsSectionProps {
    sectionName: "activities" | "accomplishments";
    details: string[];
    selectedDetails: number[];
    isViewOnly: boolean;
    onCheckboxChange: (type: "activities" | "accomplishments", idx: number) => void;
}

/**
 * PositionDetails Component
 * Displays the activities and accomplishments for a position with selection controls
 * 
 * @component
 */
export const PositionDetailsSection: React.FC<PositionDetailsSectionProps> = ({
    sectionName,
    details,
    selectedDetails,
    isViewOnly,
    onCheckboxChange
}) => {


  return (
    <>
      <h5 className="font-bold text-gray-800">{sectionName.toUpperCase() /*i.e. Activites*/}:</h5>
      {details.length > 0 ? (
        <ul className="list-none pl-0 space-y-2">
          {details.map((detail, idx) => (
            <li key={idx} className="bg-gray-100 p-2 rounded-lg my-1">
              <label className="flex items-center space-x-2">
                {!isViewOnly && (
                  <input
                    type="checkbox"
                    className="form-checkbox rounded text-blue-600 focus:border-blue-600 focus:ring focus:ring-blue-200"
                    checked={selectedDetails.includes(idx)}
                    onChange={() => onCheckboxChange(sectionName, idx)} 
                  />
                )}
                <span className="flex-1">{detail}</span>
              </label>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500">No activities found.</p>
      )}
  </>)
}; 