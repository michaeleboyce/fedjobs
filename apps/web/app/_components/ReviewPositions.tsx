// File path: apps/web/app/_components/ReviewPositions.tsx
'use client';

import React, { useState } from 'react';
import { Position } from '@fedjobs/types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faCheckCircle, faTimesCircle, faEdit, faCompressArrowsAlt } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import axios from 'axios';

interface ReviewPositionsProps {
  positions: Position[];
  approvePosition: (positionUuid: string) => Promise<{ success: boolean; position?: Position; error?: string }>;
  rejectPosition: (positionUuid: string) => Promise<{ success: boolean; message?: string; error?: string }>;
}

const ReviewPositions: React.FC<ReviewPositionsProps> = ({ positions, approvePosition, rejectPosition }) => {
  const [currentPositions, setCurrentPositions] = useState<Position[]>(positions);
  const [loadingPositions, setLoadingPositions] = useState<Set<string>>(new Set());
  const [editingPositionUuid, setEditingPositionUuid] = useState<string | null>(null);
  const [editedDetails, setEditedDetails] = useState<{ activities: string[]; accomplishments: string[] }>({ activities: [], accomplishments: [] });

  const handleApprove = async (positionUuid: string) => {
    setLoadingPositions(prev => new Set(prev).add(positionUuid));
    try {
      const response = await approvePosition(positionUuid);
      if (response.success) {
        toast.success('Position approved successfully.');
        setCurrentPositions(prev => prev.filter(pos => pos.positionUuid !== positionUuid));
      } else {
        toast.error(response.error || 'Failed to approve position.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve position.');
    } finally {
      setLoadingPositions(prev => {
        const newSet = new Set(prev);
        newSet.delete(positionUuid);
        return newSet;
      });
    }
  };

  const handleReject = async (positionUuid: string) => {
    setLoadingPositions(prev => new Set(prev).add(positionUuid));
    try {
      const response = await rejectPosition(positionUuid);
      if (response.success) {
        toast.success(response.message || 'Position rejected and deleted.');
        setCurrentPositions(prev => prev.filter(pos => pos.positionUuid !== positionUuid));
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

  const handleEdit = (position: Position) => {
    setEditingPositionUuid(position.positionUuid);
    setEditedDetails({
      activities: [...position.details.activities],
      accomplishments: [...position.details.accomplishments],
    });
  };

  const handleSaveEdit = async (positionUuid: string) => {
    try {
      // Send the edited details to the backend via an API route
      const response = await axios.put(`/api/user/positions/${positionUuid}/edit`, editedDetails);
      if (response.data.success) {
        toast.success('Position details updated successfully.');
        setCurrentPositions(prev => prev.map(pos => pos.positionUuid === positionUuid ? response.data.position : pos));
        setEditingPositionUuid(null);
      } else {
        toast.error(response.data.message || 'Failed to update position.');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update position.');
    }
  };

  const handleCancelEdit = () => {
    setEditingPositionUuid(null);
    setEditedDetails({ activities: [], accomplishments: [] });
  };

  const handleInputChange = (field: 'activities' | 'accomplishments', index: number, value: string) => {
    setEditedDetails(prev => {
      const updated = { ...prev };
      updated[field][index] = value;
      return updated;
    });
  };

  const handleAddItem = (field: 'activities' | 'accomplishments') => {
    setEditedDetails(prev => ({
      ...prev,
      [field]: [...prev[field], ''],
    }));
  };

  const handleRemoveItem = (field: 'activities' | 'accomplishments', index: number) => {
    setEditedDetails(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  };

  const handleMerge = (positionUuid: string, groupId: string) => {
    // Implement merging logic or navigate to a merge page/modal
    // For example:
    // navigate(`/merge-positions?groupId=${groupId}`);
    toast.info('Merge functionality is under development.');
  };

  if (currentPositions.length === 0) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Review Parsed Positions</h1>
        <p>No new positions to review.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Review Parsed Positions</h1>
      {currentPositions.map((position) => (
        <div key={position.positionUuid} className="border p-4 rounded mb-4 shadow">
          <h2 className="text-xl font-semibold">{position.title.title} at {position.organization.name}</h2>
          <p className="text-gray-600">{position.date.startDate} - {position.date.present ? 'Present' : position.date.endDate}</p>
          <div className="mt-2">
            <h3 className="font-bold">Activities:</h3>
            <ul className="list-disc list-inside">
              {position.details.activities.map((activity, idx) => (
                <li key={idx}>{activity}</li>
              ))}
            </ul>
          </div>
          <div className="mt-2">
            <h3 className="font-bold">Accomplishments:</h3>
            <ul className="list-disc list-inside">
              {position.details.accomplishments.map((accomplishment, idx) => (
                <li key={idx}>{accomplishment}</li>
              ))}
            </ul>
          </div>

          {/* Editing Section */}
          {editingPositionUuid === position.positionUuid ? (
            <div className="mt-4">
              <h3 className="font-bold">Edit Activities:</h3>
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

              <h3 className="font-bold">Edit Accomplishments:</h3>
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
              <button
                onClick={() => handleApprove(position.positionUuid)}
                className="bg-green-500 text-white px-4 py-2 rounded flex items-center disabled:opacity-50"
                disabled={loadingPositions.has(position.positionUuid)}
              >
                {loadingPositions.has(position.positionUuid) ? (
                  <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
                ) : (
                  <FontAwesomeIcon icon={faCheckCircle} className="mr-2" />
                )}
                Approve
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
              {/* Add Merge Button if needed */}
              <button
                onClick={() => handleMerge(position.positionUuid, position.groupId || '')}
                className="bg-purple-500 text-white px-4 py-2 rounded flex items-center"
                disabled={!position.groupId}
              >
                <FontAwesomeIcon icon={faCompressArrowsAlt} className="mr-2" />
                Merge
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ReviewPositions;
