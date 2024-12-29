"use client";

import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faChevronUp } from "@fortawesome/free-solid-svg-icons";
import { ResumeObject } from "@/app/_classes/Resume";
import { PositionObject } from "@/app/_classes/Position";

type ResumeProps = {
  resume: ResumeObject;
  onSelectionChange: (selectedState: {
    positions: {
      position: PositionObject;
      selectedActivities: number[];
      selectedAccomplishments: number[];
    }[];
  }) => void;
  isViewOnly: boolean;
};

export const Resume: React.FC<ResumeProps> = ({
  resume,
  onSelectionChange,
  isViewOnly,
}) => {
  // Which positions are expanded
  const [openPositionIndexes, setOpenPositionIndexes] = useState<number[]>([]);

  // Each position index tracks which activities/accomplishments are selected (by index)
  const [selectedPositions, setSelectedPositions] = useState<{
    [posIndex: number]: {
      selectedActivities: number[];
      selectedAccomplishments: number[];
    };
  }>({});

  // Initialize each position with empty selections
  useEffect(() => {
    const initialState: {
      [posIndex: number]: {
        selectedActivities: number[];
        selectedAccomplishments: number[];
      };
    } = {};
    resume.positions.forEach((_, index) => {
      initialState[index] = {
        selectedActivities: [],
        selectedAccomplishments: [],
      };
    });
    setSelectedPositions(initialState);
  }, [resume.positions]);

  // Whenever selections change, notify parent
  useEffect(() => {
    const positionsData = resume.positions.map((position, index) => {
      const stateForPos = selectedPositions[index] || {
        selectedActivities: [],
        selectedAccomplishments: [],
      };
      return {
        position,
        selectedActivities: stateForPos.selectedActivities,
        selectedAccomplishments: stateForPos.selectedAccomplishments,
      };
    });

    onSelectionChange({ positions: positionsData });
  }, [resume.positions, selectedPositions, onSelectionChange]);

  /**
   * Expand or collapse position details
   */
  const toggleDetails = (posIndex: number) => {
    setOpenPositionIndexes((prev) =>
      prev.includes(posIndex)
        ? prev.filter((idx) => idx !== posIndex) // close
        : [...prev, posIndex] // open
    );
  };

  /**
   * Select or unselect a single activity/accomplishment
   */
  const handleCheckboxChange = (
    posIndex: number,
    type: "activities" | "accomplishments",
    itemIndex: number
  ) => {
    if (isViewOnly) return;

    setSelectedPositions((prev) => {
      const current = prev[posIndex] || {
        selectedActivities: [],
        selectedAccomplishments: [],
      };

      // Toggle the clicked item in or out of the array
      const newArr =
        type === "activities"
          ? toggleItemInArray(current.selectedActivities, itemIndex)
          : toggleItemInArray(current.selectedAccomplishments, itemIndex);

      // Update whichever array changed
      const updatedValue =
        type === "activities"
          ? { ...current, selectedActivities: newArr }
          : { ...current, selectedAccomplishments: newArr };

      return {
        ...prev,
        [posIndex]: updatedValue,
      };
    });
  };

  /**
   * SELECT ALL items (activities & accomplishments) in a position
   */
  const handleSelectAll = (posIndex: number) => {
    if (isViewOnly) return;

    setSelectedPositions((prev) => {
      const current = prev[posIndex] || {
        selectedActivities: [],
        selectedAccomplishments: [],
      };
      const pos = resume.positions[posIndex];
      const allActivities = pos.details.activities.map((_, i) => i);
      const allAccomplishments = pos.details.accomplishments.map((_, i) => i);

      return {
        ...prev,
        [posIndex]: {
          ...current,
          selectedActivities: allActivities,
          selectedAccomplishments: allAccomplishments,
        },
      };
    });
  };

  /**
   * CLEAR ALL items in a position
   */
  const handleClearAll = (posIndex: number) => {
    if (isViewOnly) return;

    setSelectedPositions((prev) => {
      return {
        ...prev,
        [posIndex]: {
          selectedActivities: [],
          selectedAccomplishments: [],
        },
      };
    });
  };

  /**
   * Utility function to add/remove an item from an array
   */
  const toggleItemInArray = (array: number[], item: number) => {
    if (array.includes(item)) {
      return array.filter((i) => i !== item);
    } else {
      return [...array, item];
    }
  };

  return (
    <>
      {resume.positions.map((position, posIndex) => {
        const isOpen = openPositionIndexes.includes(posIndex);
        const stateForPos = selectedPositions[posIndex] || {
          selectedActivities: [],
          selectedAccomplishments: [],
        };

        // Count how many items exist total
        const totalActivities = position.details.activities.length;
        const totalAccomplishments = position.details.accomplishments.length;
        const totalItems = totalActivities + totalAccomplishments;

        // Count how many are selected
        const selectedCount =
          stateForPos.selectedActivities.length + stateForPos.selectedAccomplishments.length;

        // If all items are selected (and there is at least 1 item)
        const isAllSelected = selectedCount === totalItems && totalItems > 0;

        // Show label next to button, e.g. (2 of 6 selected)
        const selectionLabel = `(${selectedCount} of ${totalItems} selected)`;

        return (
          <div key={posIndex} className="card shadow-lg rounded-lg overflow-hidden mb-4">
            <div className="card-body bg-white p-6 text-center">
              <h4 className="card-title text-xl font-bold text-gray-800">
                {position.title.title} at {position.organization.name}
              </h4>
              <p className="text-gray-600">
                Date: {position.date.startDate} -{" "}
                {position.date.present ? "Present" : position.date.endDate}
              </p>

              {/* Only show the 'Select/Clear All' if not in view-only, and there are items */}
              {!isViewOnly && totalItems > 0 && (
                <div className="mt-2">
                  {isAllSelected ? (
                    <button
                      className="mr-2 bg-red-500 text-white px-3 py-1 rounded"
                      onClick={() => handleClearAll(posIndex)}
                    >
                      Clear All Position Info {selectionLabel}
                    </button>
                  ) : (
                    <button
                      className="mr-2 bg-blue-500 text-white px-3 py-1 rounded"
                      onClick={() => handleSelectAll(posIndex)}
                    >
                      Select All Position Info {selectionLabel}
                    </button>
                  )}
                </div>
              )}

              <button
                className="mt-3 font-semibold text-blue-600 hover:underline focus:underline"
                onClick={() => toggleDetails(posIndex)}
                aria-expanded={isOpen}
                aria-controls={`details-${posIndex}`}
              >
                {isOpen ? (
                  <>
                    Close Details <FontAwesomeIcon icon={faChevronUp} className="ml-2" />
                  </>
                ) : (
                  <>
                    View Full Details <FontAwesomeIcon icon={faChevronDown} className="ml-2" />
                  </>
                )}
              </button>

              {/* If open, show the lists of activities/accomplishments with checkboxes */}
              {isOpen && (
                <div className="card-content mt-4 text-left" id={`details-${posIndex}`}>
                  <h5 className="font-bold text-gray-800">Activities:</h5>
                  {totalActivities > 0 ? (
                    <ul className="list-none pl-0 space-y-2">
                      {position.details.activities.map((activity, idx) => (
                        <li key={idx} className="bg-gray-100 p-2 rounded-lg my-1">
                          <label className="flex items-center space-x-2">
                            {!isViewOnly && (
                              <input
                                type="checkbox"
                                className="form-checkbox rounded text-blue-600 focus:border-blue-600 focus:ring focus:ring-blue-200"
                                checked={stateForPos.selectedActivities.includes(idx)}
                                onChange={() =>
                                  handleCheckboxChange(posIndex, "activities", idx)
                                }
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

                  <h5 className="font-bold text-gray-800 mt-4">Accomplishments:</h5>
                  {totalAccomplishments > 0 ? (
                    <ul className="list-none pl-0 space-y-2">
                      {position.details.accomplishments.map((accomplishment, idx) => (
                        <li key={idx} className="bg-gray-100 p-2 rounded-lg my-1">
                          <label className="flex items-center space-x-2">
                            {!isViewOnly && (
                              <input
                                type="checkbox"
                                className="form-checkbox rounded text-blue-600 focus:border-blue-600 focus:ring focus:ring-blue-200"
                                checked={stateForPos.selectedAccomplishments.includes(idx)}
                                onChange={() =>
                                  handleCheckboxChange(posIndex, "accomplishments", idx)
                                }
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
              )}
            </div>
          </div>
        );
      })}
    </>
  );
};

export default Resume;
