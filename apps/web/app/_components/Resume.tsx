"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons';
import { ResumeObject} from "@/app/_classes/Resume";
import { PositionObject } from '../_classes/Position';

type ResumeProps = {
  resume: ResumeObject;
  onSelectionChange: (selectedState: {
    position: PositionObject | null;
    selectedActivities: number[];
    selectedAccomplishments: number[];
  }) => void;
  isViewOnly: boolean; 
};

export const Resume: React.FC<ResumeProps> = ({ resume, onSelectionChange, isViewOnly }) => {
  const [selectedPosition, setSelectedPosition] = useState<PositionObject | null>(null);
  const [selectedActivities, setSelectedActivities] = useState<number[]>([]);
  const [selectedAccomplishments, setSelectedAccomplishments] = useState<number[]>([]);

  useEffect(() => {
    if (selectedPosition || selectedActivities.length || selectedAccomplishments.length) {
      onSelectionChange({ 
        position: selectedPosition, 
        selectedActivities, 
        selectedAccomplishments 
      });
    }
  }, [selectedPosition, selectedActivities, selectedAccomplishments]);

  const handlePositionSelect = useCallback((position: PositionObject) => {
    setSelectedPosition((prev) => {
      const newPosition = prev === position ? null : position;
      if (!newPosition) {
        setSelectedActivities([]);
        setSelectedAccomplishments([]);
      }
      return newPosition;
    });
  }, []);

  const toggleDetails = (position: PositionObject) => {
    setSelectedPosition(selectedPosition === position ? null : position);
  };

  const handleCheckboxChange = useCallback((type: "activities" | "accomplishments", idx: number) => {
    if (isViewOnly) return;
    if (type === "activities") {
      setSelectedActivities(prev => {
        return prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx];
      });
    } else {
      setSelectedAccomplishments(prev => {
        return prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx];
      });
    }
  }, []);

  return (
    <>
      {resume.positions.map((position, posIndex) => (
        <div key={posIndex} className="card shadow-lg rounded-lg overflow-hidden">
          <div className="card-body bg-white p-6 text-left">
            <h4 className="card-title text-xl font-bold text-gray-800 text-center">
              {position.title.title} at {position.organization.name}
            </h4>
            <p className="text-gray-600 text-center">Date: {position.date.startDate} - {position.date.present ? "Present" : position.date.endDate}</p>
            <button
              className="font-semibold text-blue-600 hover:underline focus:underline"
              onClick={() => toggleDetails(position)}
              aria-expanded={selectedPosition === position}
              aria-controls={`details-${posIndex}`}
            >
              {selectedPosition === position ? (
                <>
                  Close Details <FontAwesomeIcon icon={faChevronUp} className="ml-2" />
                </>
              ) : (
                <>
                  View Full Details <FontAwesomeIcon icon={faChevronDown} className="ml-2" />
                </>
              )}
            </button>
            {selectedPosition === position && (
              <div className="card-content mt-4" id={`details-${posIndex}`}>
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
                              onChange={() => handleCheckboxChange("activities", idx)}
                            />
                          )}
                          <span className="flex-1">{activity}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-gray-500">No activities found.</p>}

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
                              onChange={() => handleCheckboxChange("accomplishments", idx)}
                            />
                          )}
                          <span className="flex-1">{accomplishment}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-gray-500">No accomplishments found.</p>}
              </div>
            )}
          </div>
        </div>
      ))}
    </>
  );
};

export default Resume;
