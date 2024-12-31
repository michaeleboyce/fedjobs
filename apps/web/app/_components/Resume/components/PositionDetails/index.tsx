// File path: apps/web/app/_components/Resume/components/PositionDetails/index.tsx
import React from 'react';
import { PositionObject } from '@/app/_classes/Position';

/**
 * Props for the PositionDetails component
 */
interface PositionDetailsProps {
  position: PositionObject;
  isViewOnly: boolean;
  selectedActivities: number[];
  selectedAccomplishments: number[];
  onCheckboxChange: (type: "activities" | "accomplishments", idx: number) => void;
}

/**
 * PositionDetails Component
 * Displays the activities and accomplishments for a position with selection controls
 * 
 * @component
 */
export const PositionDetails: React.FC<PositionDetailsProps> = ({
  position,
  isViewOnly,
  selectedActivities,
  selectedAccomplishments,
  onCheckboxChange,
}) => {
  return (
    <div className="card-content mt-4 text-left">
      {/* Activities Section */}
      <h5 className="font-bold text-gray-800">Activities:</h5>
      {position.details.activities.length > 0 ? (
        <ul className="list-none pl-0 space-y-2">
          {position.details.activities.map((activity, idx) => (
            <li key={idx} className="bg-gray-100 p-2 rounded-lg my-1">
              <label className="flex items-center space-x-2">
                {!isViewOnly && (
                  <input
                    type="checkbox"
                    className="form-checkbox rounded text-blue-600 focus:border-blue-600 focus:ring focus:ring-blue-200"
                    checked={selectedActivities.includes(idx)}
                    onChange={() => onCheckboxChange("activities", idx)}
                  />
                )}
                <span className="flex-1">{activity}</span>
              </label>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500">No activities found.</p>
      )}

      {/* Accomplishments Section */}
      <h5 className="font-bold text-gray-800 mt-4">Accomplishments:</h5>
      {position.details.accomplishments.length > 0 ? (
        <ul className="list-none pl-0 space-y-2">
          {position.details.accomplishments.map((accomplishment, idx) => (
            <li key={idx} className="bg-gray-100 p-2 rounded-lg my-1">
              <label className="flex items-center space-x-2">
                {!isViewOnly && (
                  <input
                    type="checkbox"
                    className="form-checkbox rounded text-blue-600 focus:border-blue-600 focus:ring focus:ring-blue-200"
                    checked={selectedAccomplishments.includes(idx)}
                    onChange={() => onCheckboxChange("accomplishments", idx)}
                  />
                )}
                <span className="flex-1">{accomplishment}</span>
              </label>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500">No accomplishments found.</p>
      )}
    </div>
  );
}; 