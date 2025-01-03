// File path: apps/web/app/_components/ReviewPositions.tsx
// apps/web/app/_components/ReviewPositions.tsx

'use client';

import React, { useState } from 'react';
import { Position } from '@fedjobs/types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faCheckCircle, faTimesCircle, faEdit, faCompressArrowsAlt } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import axios from 'axios';

interface ReviewPositionsProps {
  employmentHistory: Position[];
  otherPositions: Position[];
  addToEmploymentHistory: (positionUuid: string) => Promise<{ success: boolean; position?: Position; error?: string }>;
  rejectPosition: (positionUuid: string) => Promise<{ success: boolean; message?: string; error?: string }>;
}

const ReviewPositions: React.FC<ReviewPositionsProps> = ({ employmentHistory, otherPositions, addToEmploymentHistory, rejectPosition }) => {
  // State for employment history and other positions
  const [employmentHistoryPositions, setEmploymentHistoryPositions] = useState<Position[]>(employmentHistory);
  const [otherPositionsList, setOtherPositionsList] = useState<Position[]>(otherPositions);
  const [loadingPositions, setLoadingPositions] = useState<Set<string>>(new Set());
  const [editingPositionUuid, setEditingPositionUuid] = useState<string | null>(null);
  const [editedDetails, setEditedDetails] = useState<{ activities: string[]; accomplishments: string[] }>({ activities: [], accomplishments: [] });

  /**
   * Adds a position to Employment History
   */
  const handleAddToEmploymentHistory = async (positionUuid: string) => {
    setLoadingPositions(prev => new Set(prev).add(positionUuid));
    try {
      const response = await addToEmploymentHistory(positionUuid);
      if (response.success) {
        toast.success('Position added to Employment History.');
        setEmploymentHistoryPositions(prev => [...prev, response.position!]);
        setOtherPositionsList(prev => prev.filter(pos => pos.positionUuid !== positionUuid));
      } else {
        toast.error(response.error || 'Failed to add to Employment History.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to add to Employment History.');
    } finally {
      setLoadingPositions(prev => {
        const newSet = new Set(prev);
        newSet.delete(positionUuid);
        return newSet;
      });
    }
  };

  /**
   * Rejects a position
   */
  const handleReject = async (positionUuid: string) => {
    setLoadingPositions(prev => new Set(prev).add(positionUuid));
    try {
      const response = await rejectPosition(positionUuid);
      if (response.success) {
        toast.success(response.message || 'Position rejected and deleted.');
        setOtherPositionsList(prev => prev.filter(pos => pos.positionUuid !== positionUuid));
      } else {
        toast.error(response.error || 'Failed to reject position.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject position.');
    } finally {
      setLoadingPositions(prev => {
        const newSet = new Set(prev);
        newSet.delete(positionUuid);
        return newSet;
      });
    }
  };

  /**
   * Initiates editing of a position
   */
  const handleEdit = (position: Position) => {
    setEditingPositionUuid(position.positionUuid);
    setEditedDetails({
      activities: [...position.details.activities],
      accomplishments: [...position.details.accomplishments],
    });
  };

  /**
   * Saves the edited position details
   */
  const handleSaveEdit = async (positionUuid: string) => {
    try {
      // Send the edited details to the backend via an API route
      const response = await axios.put(`/api/user/positions/${positionUuid}/edit`, editedDetails);
      if (response.data.success) {
        toast.success('Position details updated successfully.');
        // Update in Employment History if applicable
        setEmploymentHistoryPositions(prev => prev.map(pos => pos.positionUuid === positionUuid ? response.data.position : pos));
        // Update in Other Positions if applicable
        setOtherPositionsList(prev => prev.map(pos => pos.positionUuid === positionUuid ? response.data.position : pos));
        setEditingPositionUuid(null);
      } else {
        toast.error(response.data.message || 'Failed to update position.');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update position.');
    }
  };

  /**
   * Cancels the editing process
   */
  const handleCancelEdit = () => {
    setEditingPositionUuid(null);
    setEditedDetails({ activities: [], accomplishments: [] });
  };

  /**
   * Handles input changes in the edit form
   */
  const handleInputChange = (field: 'activities' | 'accomplishments', index: number, value: string) => {
    setEditedDetails(prev => {
      const updated = { ...prev };
      updated[field][index] = value;
      return updated;
    });
  };

  /**
   * Adds a new item to activities or accomplishments
   */
  const handleAddItem = (field: 'activities' | 'accomplishments') => {
    setEditedDetails(prev => ({
      ...prev,
      [field]: [...prev[field], ''],
    }));
  };

  /**
   * Removes an item from activities or accomplishments
   */
  const handleRemoveItem = (field: 'activities' | 'accomplishments', index: number) => {
    setEditedDetails(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  };

  /**
   * Placeholder for merge functionality
   */
  const handleMerge = (positionUuid: string, groupId: string) => {
    // Implement merging logic or navigate to a merge page/modal
    // For example:
    // router.push(`/merge-positions?groupId=${groupId}`);
    toast.info('Merge functionality is under development.');
  };

  /**
   * Renders a position card with conditional actions based on its section.
   */
  const renderPositionCard = (position: Position, isEmploymentHistory: boolean) => {
    return (
      <div key={position.positionUuid} className="border p-4 rounded mb-4 shadow">
        <h3 className="text-lg font-semibold">{position.title.title} at {position.organization.name}</h3>
        <p className="text-gray-600">{position.date.startDate} - {position.date.present ? 'Present' : position.date.endDate}</p>
        <div className="mt-2">
          <h4 className="font-bold">Activities:</h4>
          <ul className="list-disc list-inside">
            {position.details.activities.map((activity, idx) => (
              <li key={idx}>{activity}</li>
            ))}
          </ul>
        </div>
        <div className="mt-2">
          <h4 className="font-bold">Accomplishments:</h4>
          <ul className="list-disc list-inside">
            {position.details.accomplishments.map((accomplishment, idx) => (
              <li key={idx}>{accomplishment}</li>
            ))}
          </ul>
        </div>

        {/* Link to original document or position */}
        {isEmploymentHistory ? (
          position.originalPositionUuid && (
            <div className="mt-2">
              <a href={`/positions/${position.originalPositionUuid}`} className="text-blue-500 hover:underline">
                View Original Position
              </a>
            </div>
          )
        ) : (
          position.originalDocumentId && position.originalDocumentName && (
            <div className="mt-2">
              <a href={`/documents/${position.originalDocumentId}`} className="text-blue-500 hover:underline">
                View Original Document: {position.originalDocumentName}
              </a>
            </div>
          )
        )}

        {/* Editing Section */}
        {editingPositionUuid === position.positionUuid ? (
          <div className="mt-4">
            <h4 className="font-bold">Edit Activities:</h4>
            {editedDetails.activities.map((activity, idx) => (
              <div key={idx} className="flex items-center mb-2">
                <input
                  type="text"
                  value={activity}
                  onChange={(e) => handleInputChange('activities', idx, e.target.value)}
                  className="border p-2 rounded flex-1 mr-2"
                />
                <button onClick={() => handleRemoveItem('activities', idx)} className="text-red-500">
                  &times;
                </button>
              </div>
            ))}
            <button onClick={() => handleAddItem('activities')} className="text-blue-500 underline mb-4">
              Add Activity
            </button>

            <h4 className="font-bold">Edit Accomplishments:</h4>
            {editedDetails.accomplishments.map((accomplishment, idx) => (
              <div key={idx} className="flex items-center mb-2">
                <input
                  type="text"
                  value={accomplishment}
                  onChange={(e) => handleInputChange('accomplishments', idx, e.target.value)}
                  className="border p-2 rounded flex-1 mr-2"
                />
                <button onClick={() => handleRemoveItem('accomplishments', idx)} className="text-red-500">
                  &times;
                </button>
              </div>
            ))}
            <button onClick={() => handleAddItem('accomplishments')} className="text-blue-500 underline mb-4">
              Add Accomplishment
            </button>

            <div className="flex space-x-2">
              <button
                onClick={() => handleSaveEdit(position.positionUuid)}
                className="bg-green-500 text-white px-4 py-2 rounded flex items-center"
              >
                <FontAwesomeIcon icon={faCheckCircle} className="mr-2" />
                Save
              </button>
              <button
                onClick={handleCancelEdit}
                className="bg-gray-500 text-white px-4 py-2 rounded flex items-center"
              >
                <FontAwesomeIcon icon={faTimesCircle} className="mr-2" />
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex space-x-2">
            {isEmploymentHistory ? (
              <>
                {/* Optionally, add actions specific to Employment History */}
                <button
                  onClick={() => handleEdit(position)}
                  className="bg-blue-500 text-white px-4 py-2 rounded flex items-center"
                >
                  <FontAwesomeIcon icon={faEdit} className="mr-2" />
                  Edit
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => handleAddToEmploymentHistory(position.positionUuid)}
                  className={`bg-green-500 text-white px-4 py-2 rounded flex items-center disabled:opacity-50`}
                  disabled={loadingPositions.has(position.positionUuid)}
                >
                  {loadingPositions.has(position.positionUuid) ? (
                    <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
                  ) : (
                    <FontAwesomeIcon icon={faCheckCircle} className="mr-2" />
                  )}
                  Add to Employment History
                </button>
                <button
                  onClick={() => handleReject(position.positionUuid)}
                  className="bg-red-500 text-white px-4 py-2 rounded flex items-center disabled:opacity-50"
                  disabled={loadingPositions.has(position.positionUuid)}
                >
                  {loadingPositions.has(position.positionUuid) ? (
                    <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
                  ) : (
                    <FontAwesomeIcon icon={faTimesCircle} className="mr-2" />
                  )}
                  Reject
                </button>
                <button
                  onClick={() => handleEdit(position)}
                  className="bg-blue-500 text-white px-4 py-2 rounded flex items-center"
                >
                  <FontAwesomeIcon icon={faEdit} className="mr-2" />
                  Edit
                </button>
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Review Positions</h1>
      
      {/* Employment History Section */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Employment History</h2>
        {employmentHistoryPositions.length === 0 ? (
          <p>No positions in Employment History.</p>
        ) : (
          employmentHistoryPositions.map((position) => renderPositionCard(position, true))
        )}
      </section>

      {/* Other Positions Section */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Other Positions</h2>
        {otherPositionsList.length === 0 ? (
          <p>No positions to review.</p>
        ) : (
          otherPositionsList.map((position) => renderPositionCard(position, false))
        )}
      </section>
    </div>
  );
};

export default ReviewPositions;
