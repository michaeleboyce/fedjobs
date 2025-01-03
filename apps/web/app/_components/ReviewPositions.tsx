// File path: apps/web/app/_components/ReviewPositions.tsx

'use client';

import React, { useState } from 'react';
import { Position } from '@fedjobs/types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSpinner,
  faCheckCircle,
  faTimesCircle,
  faEdit,
  faChevronDown,
  faChevronUp,
} from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';

interface ReviewPositionsProps {
  employmentHistory: Position[];
  otherPositions: Position[];
  addToEmploymentHistory: (
    positionUuid: string
  ) => Promise<{ success: boolean; position?: Position; error?: string }>;
  rejectPosition: (
    positionUuid: string
  ) => Promise<{ success: boolean; message?: string; error?: string }>;
  updatePosition: (
    positionUuid: string,
    updatedFields: Partial<Position>
  ) => Promise<{ success: boolean; error?: string }>;
  approveSimilarPosition: (
    currentUuid: string,
    similarUuid: string
  ) => Promise<{ success: boolean; error?: string }>;
  rejectSimilarPosition: (
    currentUuid: string,
    similarUuid: string
  ) => Promise<{ success: boolean; error?: string }>;
}

interface EditedDetails {
  title: string;
  organization: string;
  startDate: string;
  endDate: string;
  present: boolean;
  activities: string[];
  accomplishments: string[];
}

const ReviewPositions: React.FC<ReviewPositionsProps> = ({
  employmentHistory,
  otherPositions,
  addToEmploymentHistory,
  rejectPosition,
  updatePosition,
  approveSimilarPosition,
  rejectSimilarPosition,
}) => {
  // State for employment history and other positions
  const [employmentHistoryPositions, setEmploymentHistoryPositions] =
    useState<Position[]>(employmentHistory);
  const [otherPositionsList, setOtherPositionsList] = useState<Position[]>(
    otherPositions
  );
  const [loadingPositions, setLoadingPositions] = useState<Set<string>>(
    new Set()
  );
  const [editingPositionUuid, setEditingPositionUuid] = useState<string | null>(
    null
  );
  const [editedDetails, setEditedDetails] = useState<EditedDetails>({
    title: '',
    organization: '',
    startDate: '',
    endDate: '',
    present: false,
    activities: [],
    accomplishments: [],
  });

  // State for expanded positions to show similar positions
  const [expandedPositionUuids, setExpandedPositionUuids] = useState<Set<string>>(
    new Set()
  );

  /**
   * Adds a position to Employment History
   */
  const handleAddToEmploymentHistory = async (positionUuid: string) => {
    setLoadingPositions((prev) => new Set(prev).add(positionUuid));
    try {
      const response = await addToEmploymentHistory(positionUuid);
      if (response.success && response.position) {
        toast.success('Position added to Employment History.');
        setEmploymentHistoryPositions((prev) => [...prev, response.position!]);
        setOtherPositionsList((prev) =>
          prev.filter((pos) => pos.positionUuid !== positionUuid)
        );
      } else {
        toast.error(response.error || 'Failed to add to Employment History.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to add to Employment History.');
    } finally {
      setLoadingPositions((prev) => {
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
    setLoadingPositions((prev) => new Set(prev).add(positionUuid));
    try {
      const response = await rejectPosition(positionUuid);
      if (response.success) {
        toast.success(response.message || 'Position rejected and deleted.');
        setOtherPositionsList((prev) =>
          prev.filter((pos) => pos.positionUuid !== positionUuid)
        );
      } else {
        toast.error(response.error || 'Failed to reject position.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject position.');
    } finally {
      setLoadingPositions((prev) => {
        const newSet = new Set(prev);
        newSet.delete(positionUuid);
        return newSet;
      });
    }
  };

  /**
   * Toggles the expanded state of a position to show/hide similar positions.
   */
  const toggleExpand = (positionUuid: string) => {
    setExpandedPositionUuids((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(positionUuid)) {
        newSet.delete(positionUuid);
      } else {
        newSet.add(positionUuid);
      }
      return newSet;
    });
  };

  /**
   * Handles approving a similar position.
   */
  const handleApproveSimilar = async (
    currentUuid: string,
    similarUuid: string
  ) => {
    setLoadingPositions((prev) => new Set(prev).add(similarUuid));
    try {
      const response = await approveSimilarPosition(currentUuid, similarUuid);
      if (response.success) {
        toast.success('Similar position approved.');
        // Update state accordingly
        setEmploymentHistoryPositions((prev) =>
          prev.map((pos) => {
            if (pos.positionUuid === currentUuid) {
              return {
                ...pos,
                approvedSimilarPositionUuids: [
                  ...pos.approvedSimilarPositionUuids,
                  similarUuid,
                ],
                similarPositionUuids: pos.similarPositionUuids.filter(
                  (uuid) => uuid !== similarUuid
                ),
              };
            }
            return pos;
          })
        );
        setOtherPositionsList((prev) =>
          prev.map((pos) => {
            if (pos.positionUuid === similarUuid) {
              return {
                ...pos,
                approvedSimilarPositionUuids: [
                  ...pos.approvedSimilarPositionUuids,
                  currentUuid,
                ],
                similarPositionUuids: pos.similarPositionUuids.filter(
                  (uuid) => uuid !== currentUuid
                ),
              };
            }
            return pos;
          })
        );
      } else {
        toast.error(response.error || 'Failed to approve similar position.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve similar position.');
    } finally {
      setLoadingPositions((prev) => {
        const newSet = new Set(prev);
        newSet.delete(similarUuid);
        return newSet;
      });
    }
  };

  /**
   * Handles rejecting a similar position.
   */
  const handleRejectSimilar = async (
    currentUuid: string,
    similarUuid: string
  ) => {
    setLoadingPositions((prev) => new Set(prev).add(similarUuid));
    try {
      const response = await rejectSimilarPosition(currentUuid, similarUuid);
      if (response.success) {
        toast.success('Similar position rejected.');
        // Update state accordingly
        setEmploymentHistoryPositions((prev) =>
          prev.map((pos) => {
            if (pos.positionUuid === currentUuid) {
              return {
                ...pos,
                rejectedSimilarPositionUuids: [
                  ...pos.rejectedSimilarPositionUuids,
                  similarUuid,
                ],
                similarPositionUuids: pos.similarPositionUuids.filter(
                  (uuid) => uuid !== similarUuid
                ),
              };
            }
            return pos;
          })
        );
        setOtherPositionsList((prev) =>
          prev.map((pos) => {
            if (pos.positionUuid === similarUuid) {
              return {
                ...pos,
                rejectedSimilarPositionUuids: [
                  ...pos.rejectedSimilarPositionUuids,
                  currentUuid,
                ],
                similarPositionUuids: pos.similarPositionUuids.filter(
                  (uuid) => uuid !== currentUuid
                ),
              };
            }
            return pos;
          })
        );
      } else {
        toast.error(response.error || 'Failed to reject similar position.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject similar position.');
    } finally {
      setLoadingPositions((prev) => {
        const newSet = new Set(prev);
        newSet.delete(similarUuid);
        return newSet;
      });
    }
  };

  /**
   * Initiates editing of a position with all fields.
   */
  const handleEdit = (position: Position) => {
    setEditingPositionUuid(position.positionUuid);
    setEditedDetails({
      title: position.title.title,
      organization: position.organization.name,
      startDate: position.date.startDate,
      endDate: position.date.endDate,
      present: position.date.present,
      activities: [...position.details.activities],
      accomplishments: [...position.details.accomplishments],
    });
  };

  /**
   * Cancels the editing process
   */
  const handleCancelEdit = () => {
    setEditingPositionUuid(null);
    setEditedDetails({
      title: '',
      organization: '',
      startDate: '',
      endDate: '',
      present: false,
      activities: [],
      accomplishments: [],
    });
  };

  /**
   * Handles input changes in the edit form for any field.
   */
  const handleInputChange = (
    field: keyof EditedDetails,
    value: any,
    index?: number
  ) => {
    if (field === 'activities' && typeof index === 'number') {
      const updatedActivities = [...editedDetails.activities];
      updatedActivities[index] = value;
      setEditedDetails((prev) => ({
        ...prev,
        activities: updatedActivities,
      }));
    } else if (field === 'accomplishments' && typeof index === 'number') {
      const updatedAccomplishments = [...editedDetails.accomplishments];
      updatedAccomplishments[index] = value;
      setEditedDetails((prev) => ({
        ...prev,
        accomplishments: updatedAccomplishments,
      }));
    } else {
      setEditedDetails((prev) => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  /**
   * Adds a new item to activities or accomplishments
   */
  const handleAddItem = (field: 'activities' | 'accomplishments') => {
    setEditedDetails((prev) => ({
      ...prev,
      [field]: [...prev[field], ''],
    }));
  };

  /**
   * Removes an item from activities or accomplishments
   */
  const handleRemoveItem = (field: 'activities' | 'accomplishments', index: number) => {
    setEditedDetails((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  };

  /**
   * Saves the edited position details, including all fields.
   */
  const handleSaveEdit = async (positionUuid: string) => {
    try {
      // Send the edited details to the backend via the updatePosition action
      const response = await updatePosition(positionUuid, {
        title: { title: editedDetails.title },
        organization: { name: editedDetails.organization },
        date: {
          startDate: editedDetails.startDate,
          endDate: editedDetails.endDate,
          present: editedDetails.present,
        },
        details: {
          activities: editedDetails.activities,
          accomplishments: editedDetails.accomplishments,
        },
      });

      if (response.success) {
        toast.success('Position details updated successfully.');
        // Update in Employment History if applicable
        setEmploymentHistoryPositions((prev) =>
          prev.map((pos) =>
            pos.positionUuid === positionUuid
              ? {
                  ...pos,
                  title: { title: editedDetails.title },
                  organization: { name: editedDetails.organization },
                  date: {
                    startDate: editedDetails.startDate,
                    endDate: editedDetails.endDate,
                    present: editedDetails.present,
                  },
                  details: {
                    activities: editedDetails.activities,
                    accomplishments: editedDetails.accomplishments,
                  },
                }
              : pos
          )
        );
        // Update in Other Positions if applicable
        setOtherPositionsList((prev) =>
          prev.map((pos) =>
            pos.positionUuid === positionUuid
              ? {
                  ...pos,
                  title: { title: editedDetails.title },
                  organization: { name: editedDetails.organization },
                  date: {
                    startDate: editedDetails.startDate,
                    endDate: editedDetails.endDate,
                    present: editedDetails.present,
                  },
                  details: {
                    activities: editedDetails.activities,
                    accomplishments: editedDetails.accomplishments,
                  },
                }
              : pos
          )
        );
        setEditingPositionUuid(null);
      } else {
        toast.error(response.error || 'Failed to update position.');
      }
    } catch (err: any) {
      toast.error(err.error || 'Failed to update position.');
    }
  };

  /**
   * Renders the list of approved similar positions.
   */
  const renderApprovedSimilarPositions = (currentPosition: Position) => {
    return currentPosition.approvedSimilarPositionUuids.length > 0 ? (
      <div className="ml-4 mt-2">
        <h4 className="font-semibold">Approved Similar Positions:</h4>
        {currentPosition.approvedSimilarPositionUuids.map((uuid) => {
          const similarPos = otherPositionsList.find(
            (pos) => pos.positionUuid === uuid
          );
          if (!similarPos) return null;
          return (
            <div key={uuid} className="border p-2 rounded mb-2">
              <p>
                {similarPos.title.title} at {similarPos.organization.name}
              </p>
              <p className="text-gray-600">
                {similarPos.date.startDate} -{' '}
                {similarPos.date.present ? 'Present' : similarPos.date.endDate}
              </p>
              {/* Optionally, add more details or actions */}
            </div>
          );
        })}
      </div>
    ) : (
      <p className="ml-4 mt-2 text-gray-500">No approved similar positions.</p>
    );
  };

  /**
   * Renders the list of pending similar positions for review.
   */
  const renderPendingSimilarPositions = (currentPosition: Position) => {
    return currentPosition.similarPositionUuids.length > 0 ? (
      <div className="ml-4 mt-2">
        <h4 className="font-semibold">Pending Similar Positions:</h4>
        {currentPosition.similarPositionUuids.map((uuid) => {
          const similarPos = otherPositionsList.find(
            (pos) => pos.positionUuid === uuid
          );
          if (!similarPos) return null;
          const isLoading = loadingPositions.has(uuid);
          return (
            <div
              key={uuid}
              className="border p-2 rounded mb-2 flex justify-between items-center"
            >
              <div>
                <p>
                  {similarPos.title.title} at {similarPos.organization.name}
                </p>
                <p className="text-gray-600">
                  {similarPos.date.startDate} -{' '}
                  {similarPos.date.present ? 'Present' : similarPos.date.endDate}
                </p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() =>
                    handleApproveSimilar(currentPosition.positionUuid, uuid)
                  }
                  className="bg-green-500 text-white px-3 py-1 rounded flex items-center"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
                  ) : (
                    <FontAwesomeIcon icon={faCheckCircle} className="mr-2" />
                  )}
                  Approve
                </button>
                <button
                  onClick={() =>
                    handleRejectSimilar(currentPosition.positionUuid, uuid)
                  }
                  className="bg-red-500 text-white px-3 py-1 rounded flex items-center"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
                  ) : (
                    <FontAwesomeIcon icon={faTimesCircle} className="mr-2" />
                  )}
                  Reject
                </button>
              </div>
            </div>
          );
        })}
      </div>
    ) : (
      <p className="ml-4 mt-2 text-gray-500">No pending similar positions.</p>
    );
  };

  /**
   * Renders the edit form with all editable fields.
   */
  const renderEditForm = (position: Position) => {
    return (
      <div className="mt-4">
        <h4 className="font-bold">Edit Position:</h4>
        {/* Title */}
        <div className="mb-2">
          <label className="block font-semibold">Title:</label>
          <input
            type="text"
            value={editedDetails.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            className="border p-2 rounded w-full"
          />
        </div>
        {/* Organization */}
        <div className="mb-2">
          <label className="block font-semibold">Organization:</label>
          <input
            type="text"
            value={editedDetails.organization}
            onChange={(e) => handleInputChange('organization', e.target.value)}
            className="border p-2 rounded w-full"
          />
        </div>
        {/* Dates */}
        <div className="mb-2 flex space-x-2">
          <div>
            <label className="block font-semibold">Start Date:</label>
            <input
              type="date"
              value={editedDetails.startDate}
              onChange={(e) => handleInputChange('startDate', e.target.value)}
              className="border p-2 rounded"
            />
          </div>
          <div>
            <label className="block font-semibold">End Date:</label>
            <input
              type="date"
              value={editedDetails.endDate}
              onChange={(e) => handleInputChange('endDate', e.target.value)}
              className="border p-2 rounded"
            />
          </div>
          <div className="flex items-center mt-6">
            <input
              type="checkbox"
              checked={editedDetails.present}
              onChange={(e) => handleInputChange('present', e.target.checked)}
              className="mr-2"
            />
            <label>Present</label>
          </div>
        </div>
        {/* Activities */}
        <div className="mb-2">
          <h5 className="font-semibold">Activities:</h5>
          {editedDetails.activities.map((activity, idx) => (
            <div key={idx} className="flex items-center mb-2">
              <input
                type="text"
                value={activity}
                onChange={(e) =>
                  handleInputChange('activities', e.target.value, idx)
                }
                className="border p-2 rounded flex-1 mr-2"
              />
              <button
                onClick={() => handleRemoveItem('activities', idx)}
                className="text-red-500"
                aria-label={`Remove Activity ${idx + 1}`}
              >
                &times;
              </button>
            </div>
          ))}
          <button
            onClick={() => handleAddItem('activities')}
            className="text-blue-500 underline mb-4"
          >
            Add Activity
          </button>
        </div>
        {/* Accomplishments */}
        <div className="mb-2">
          <h5 className="font-semibold">Accomplishments:</h5>
          {editedDetails.accomplishments.map((accomplishment, idx) => (
            <div key={idx} className="flex items-center mb-2">
              <input
                type="text"
                value={accomplishment}
                onChange={(e) =>
                  handleInputChange('accomplishments', e.target.value, idx)
                }
                className="border p-2 rounded flex-1 mr-2"
              />
              <button
                onClick={() => handleRemoveItem('accomplishments', idx)}
                className="text-red-500"
                aria-label={`Remove Accomplishment ${idx + 1}`}
              >
                &times;
              </button>
            </div>
          ))}
          <button
            onClick={() => handleAddItem('accomplishments')}
            className="text-blue-500 underline mb-4"
          >
            Add Accomplishment
          </button>
        </div>

        {/* Save and Cancel Buttons */}
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
    );
  };

  /**
   * Renders a position card with conditional actions based on its section.
   */
  const renderPositionCard = (position: Position, isEmploymentHistory: boolean) => {
    const isExpanded = expandedPositionUuids.has(position.positionUuid);
    return (
      <div
        key={position.positionUuid}
        className="border p-4 rounded mb-4 shadow"
      >
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold">
              {position.title.title} at {position.organization.name}
            </h3>
            <p className="text-gray-600">
              {position.date.startDate} -{' '}
              {position.date.present ? 'Present' : position.date.endDate}
            </p>
          </div>
          <button
            onClick={() => toggleExpand(position.positionUuid)}
            className="text-gray-500 hover:text-gray-700"
            aria-label={isExpanded ? 'Collapse Position' : 'Expand Position'}
          >
            <FontAwesomeIcon
              icon={isExpanded ? faChevronUp : faChevronDown}
            />
          </button>
        </div>

        {/* Details Section */}
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
              <a
                href={`/positions/${position.originalPositionUuid}`}
                className="text-blue-500 hover:underline"
              >
                View Original Position
              </a>
            </div>
          )
        ) : (
          position.originalDocumentId && (
            <div className="mt-2">
              <a
                href={`/documents/${position.originalDocumentId}`}
                className="text-blue-500 hover:underline"
              >
                View Original Document
              </a>
            </div>
          )
        )}

        {/* Expandable Similar Positions Section */}
        {isExpanded && (
          <div className="mt-4">
            {/* Approved Similar Positions */}
            {renderApprovedSimilarPositions(position)}
            {/* Pending Similar Positions */}
            {renderPendingSimilarPositions(position)}
          </div>
        )}

        {/* Editing Section */}
        {editingPositionUuid === position.positionUuid ? (
          renderEditForm(position)
        ) : (
          <div className="mt-4 flex space-x-2">
            {isEmploymentHistory ? (
              <>
                {/* Actions specific to Employment History */}
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
          employmentHistoryPositions.map((position) =>
            renderPositionCard(position, true)
          )
        )}
      </section>

      {/* Other Positions Section */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Other Positions</h2>
        {otherPositionsList.length === 0 ? (
          <p>No positions to review.</p>
        ) : (
          otherPositionsList.map((position) =>
            renderPositionCard(position, false)
          )
        )}
      </section>
    </div>
  );
};

export default ReviewPositions;
