// File path: apps/web/app/_components/ReviewPositions/index.tsx

"use client";

import React, { useState, useEffect } from "react";
import { Position } from "@fedjobs/types";
import {
  addToEmploymentHistory,
  rejectPosition,
  approveSimilarPosition,
  rejectSimilarPosition,
  removeFromEmploymentHistory,
  updatePosition,
  getAllPositions,
} from "../../_actions/positions/reviewPositionActions";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSpinner,
  faEdit,
  faTrash,
  faCheckCircle,
  faTimesCircle,
} from "@fortawesome/free-solid-svg-icons";
import { toast } from "react-toastify";
import { SimilarPositionCard } from "@/app/_components/Resume/components/SimilarPositionCard";
import { toggleItemInArray } from "@/app/_components/Resume/utils/selectionUtils";
import { SearchBar } from "../SearchBar";
import { PositionsSection }  from "./PositionsSection";

interface ReviewPositionsProps {}

const ReviewPositions: React.FC<ReviewPositionsProps> = () => {
  const [employmentHistoryPositions, setEmploymentHistoryPositions] = useState<Position[]>([]);
  const [otherPositions, setOtherPositions] = useState<Position[]>([]);
  const [loadingPositions, setLoadingPositions] = useState<Set<string>>(new Set());
  const [editingPositionUuid, setEditingPositionUuid] = useState<string | null>(null);
  const [editedDetails, setEditedDetails] = useState<Partial<Position>>({});
  const [expandedPositions, setExpandedPositions] = useState<Set<string>>(new Set());

  // Search state
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Selection state: Maps positionUuid to selectedActivities and selectedAccomplishments
  const [selectedSelections, setSelectedSelections] = useState<
    Record<
      string,
      { selectedActivities: number[]; selectedAccomplishments: number[] }
    >
  >({});

  useEffect(() => {
    // Fetch all positions on component mount
    const fetchPositions = async () => {
      const response = await getAllPositions();
      if (response.success) {
        setEmploymentHistoryPositions(response.employmentHistory);
        setOtherPositions(response.otherPositions);

        // Initialize selections
        const initialSelections: Record<
          string,
          { selectedActivities: number[]; selectedAccomplishments: number[] }
        > = {};
        response.employmentHistory.forEach((pos) => {
          initialSelections[pos.positionUuid] = {
            selectedActivities: [],
            selectedAccomplishments: [],
          };
        });
        response.otherPositions.forEach((pos) => {
          initialSelections[pos.positionUuid] = {
            selectedActivities: [],
            selectedAccomplishments: [],
          };
        });
        setSelectedSelections(initialSelections);
      } else {
        toast.error(response.error);
      }
    };
    fetchPositions();
  }, []);

  /**
   * Handles toggling the expansion of a position card
   */
  const handleToggleExpand = (positionUuid: string) => {
    setExpandedPositions((prev) => {
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
   * Handles adding a position to Employment History
   */
  const handleAddToEmploymentHistory = async (positionUuid: string) => {
    setLoadingPositions((prev) => new Set(prev).add(positionUuid));
    try {
      const response = await addToEmploymentHistory(positionUuid);
      if (response.success && response.position) {
        toast.success("Position added to Employment History.");
        setEmploymentHistoryPositions((prev) => [...prev, response.position]);
        setOtherPositions((prev) => prev.filter((pos) => pos.positionUuid !== positionUuid));
        setSelectedSelections((prev) => ({
          ...prev,
          [response.position.positionUuid]: {
            selectedActivities: [],
            selectedAccomplishments: [],
          },
        }));
      } else if (!response.success && response.error) {
        toast.error(response.error);
      } else {
        toast.error("Failed to add to Employment History.");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to add to Employment History.");
    } finally {
      setLoadingPositions((prev) => {
        const newSet = new Set(prev);
        newSet.delete(positionUuid);
        return newSet;
      });
    }
  };

  /**
   * Handles removing a position from Employment History
   */
  const handleRemoveFromEmploymentHistory = async (positionUuid: string) => {
    setLoadingPositions((prev) => new Set(prev).add(positionUuid));
    try {
      const response = await removeFromEmploymentHistory(positionUuid);
      if (response.success) {
        toast.success(response.message);
        setEmploymentHistoryPositions((prev) =>
          prev.filter((pos) => pos.positionUuid !== positionUuid)
        );
        // Optionally, add it back to otherPositions if needed
      } else {
        toast.error(response.error || "Failed to remove from Employment History.");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to remove from Employment History.");
    } finally {
      setLoadingPositions((prev) => {
        const newSet = new Set(prev);
        newSet.delete(positionUuid);
        return newSet;
      });
    }
  };

  /**
   * Handles rejecting a position
   */
  const handleRejectPosition = async (positionUuid: string) => {
    setLoadingPositions((prev) => new Set(prev).add(positionUuid));
    try {
      const response = await rejectPosition(positionUuid);
      if (response.success) {
        toast.success(response.message || "Position rejected and deleted.");
        setOtherPositions((prev) =>
          prev.filter((pos) => pos.positionUuid !== positionUuid)
        );
      } else {
        toast.error(response.error || "Failed to reject position.");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to reject position.");
    } finally {
      setLoadingPositions((prev) => {
        const newSet = new Set(prev);
        newSet.delete(positionUuid);
        return newSet;
      });
    }
  };

  /**
   * Handles approving a similar position
   */
  const handleApproveSimilar = async (
    currentPositionUuid: string,
    similarPositionUuid: string
  ) => {
    setLoadingPositions((prev) => new Set(prev).add(similarPositionUuid));
    try {
      const response = await approveSimilarPosition(
        currentPositionUuid,
        similarPositionUuid
      );
      if (response.success) {
        toast.success("Similar position approved.");
        // Update the state accordingly
        setEmploymentHistoryPositions((prev) =>
          prev.map((pos) =>
            pos.positionUuid === currentPositionUuid
              ? {
                  ...pos,
                  approvedSimilarPositionUuids: [
                    ...(pos.approvedSimilarPositionUuids || []),
                    similarPositionUuid,
                  ],
                  similarPositionUuids: pos.similarPositionUuids.filter(
                    (uuid) => uuid !== similarPositionUuid
                  ),
                }
              : pos
          )
        );
        setOtherPositions((prev) =>
          prev.map((pos) =>
            pos.positionUuid === similarPositionUuid
              ? {
                  ...pos,
                  approvedSimilarPositionUuids: [
                    ...(pos.approvedSimilarPositionUuids || []),
                    currentPositionUuid,
                  ],
                  similarPositionUuids: pos.similarPositionUuids.filter(
                    (uuid) => uuid !== currentPositionUuid
                  ),
                }
              : pos
          )
        );
      } else {
        toast.error(response.error || "Failed to approve similar position.");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to approve similar position.");
    } finally {
      setLoadingPositions((prev) => {
        const newSet = new Set(prev);
        newSet.delete(similarPositionUuid);
        return newSet;
      });
    }
  };

  /**
   * Handles rejecting a similar position
   */
  const handleRejectSimilar = async (
    currentPositionUuid: string,
    similarPositionUuid: string
  ) => {
    setLoadingPositions((prev) => new Set(prev).add(similarPositionUuid));
    try {
      const response = await rejectSimilarPosition(
        currentPositionUuid,
        similarPositionUuid
      );
      if (response.success) {
        toast.success("Similar position rejected.");
        // Update the state accordingly
        setEmploymentHistoryPositions((prev) =>
          prev.map((pos) =>
            pos.positionUuid === currentPositionUuid
              ? {
                  ...pos,
                  rejectedSimilarPositionUuids: [
                    ...(pos.rejectedSimilarPositionUuids || []),
                    similarPositionUuid,
                  ],
                  similarPositionUuids: pos.similarPositionUuids.filter(
                    (uuid) => uuid !== similarPositionUuid
                  ),
                }
              : pos
          )
        );
        setOtherPositions((prev) =>
          prev.map((pos) =>
            pos.positionUuid === similarPositionUuid
              ? {
                  ...pos,
                  rejectedSimilarPositionUuids: [
                    ...(pos.rejectedSimilarPositionUuids || []),
                    currentPositionUuid,
                  ],
                  similarPositionUuids: pos.similarPositionUuids.filter(
                    (uuid) => uuid !== currentPositionUuid
                  ),
                }
              : pos
          )
        );
      } else {
        toast.error(response.error || "Failed to reject similar position.");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to reject similar position.");
    } finally {
      setLoadingPositions((prev) => {
        const newSet = new Set(prev);
        newSet.delete(similarPositionUuid);
        return newSet;
      });
    }
  };

  /**
   * Handles editing a position
   */
  const handleEditPosition = (position: Position) => {
    setEditingPositionUuid(position.positionUuid);
    setEditedDetails(position);
  };

  /**
   * Handles cancelling the edit process
   */
  const handleCancelEdit = () => {
    setEditingPositionUuid(null);
    setEditedDetails({});
  };

  /**
   * Handles input changes in the edit form
   */
  const handleInputChange = (field: keyof Position, value: any) => {
    setEditedDetails((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  /**
   * Handles saving the edited position
   */
  const handleSaveEdit = async (positionUuid: string) => {
    setLoadingPositions((prev) => new Set(prev).add(positionUuid));
    try {
      const response = await updatePosition(positionUuid, editedDetails);
      if (response.success) {
        toast.success("Position updated successfully.");
        // Update the state accordingly
        setEmploymentHistoryPositions((prev) =>
          prev.map((pos) =>
            pos.positionUuid === positionUuid
              ? { ...pos, ...editedDetails }
              : pos
          )
        );
        setOtherPositions((prev) =>
          prev.map((pos) =>
            pos.positionUuid === positionUuid
              ? { ...pos, ...editedDetails }
              : pos
          )
        );
        handleCancelEdit();
      } else {
        toast.error(response.error || "Failed to update position.");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to update position.");
    } finally {
      setLoadingPositions((prev) => {
        const newSet = new Set(prev);
        newSet.delete(positionUuid);
        return newSet;
      });
    }
  };

  /**
   * Handles checkbox changes for activities and accomplishments
   */
  const handleCheckboxChange = (
    positionUuid: string,
    type: "activities" | "accomplishments",
    idx: number
  ) => {
    setSelectedSelections((prev) => {
      const current = prev[positionUuid] || {
        selectedActivities: [],
        selectedAccomplishments: [],
      };
      const updated = { ...current };

      if (type === "activities") {
        updated.selectedActivities = toggleItemInArray(
          current.selectedActivities,
          idx
        );
      } else {
        updated.selectedAccomplishments = toggleItemInArray(
          current.selectedAccomplishments,
          idx
        );
      }

      return {
        ...prev,
        [positionUuid]: updated,
      };
    });
  };

  /**
   * Handles selecting all items in a position
   */
  const handleSelectAll = (
    positionUuid: string,
    type: "activities" | "accomplishments"
  ) => {
    setSelectedSelections((prev) => {
      const current = prev[positionUuid] || {
        selectedActivities: [],
        selectedAccomplishments: [],
      };
      const updated = { ...current };

      if (type === "activities") {
        const position =
          employmentHistoryPositions.find(
            (pos) => pos.positionUuid === positionUuid
          ) || otherPositions.find((pos) => pos.positionUuid === positionUuid);
        const totalActivities = position?.details.activities.length || 0;
        updated.selectedActivities = Array.from(
          { length: totalActivities },
          (_, i) => i
        );
      } else {
        const position =
          employmentHistoryPositions.find(
            (pos) => pos.positionUuid === positionUuid
          ) || otherPositions.find((pos) => pos.positionUuid === positionUuid);
        const totalAccomplishments =
          position?.details.accomplishments.length || 0;
        updated.selectedAccomplishments = Array.from(
          { length: totalAccomplishments },
          (_, i) => i
        );
      }

      return {
        ...prev,
        [positionUuid]: updated,
      };
    });
  };

  /**
   * Handles clearing all selections in a position
   */
  const handleClearAll = (
    positionUuid: string,
    type: "activities" | "accomplishments"
  ) => {
    setSelectedSelections((prev) => {
      const current = prev[positionUuid] || {
        selectedActivities: [],
        selectedAccomplishments: [],
      };
      const updated = { ...current };

      if (type === "activities") {
        updated.selectedActivities = [];
      } else {
        updated.selectedAccomplishments = [];
      }

      return {
        ...prev,
        [positionUuid]: updated,
      };
    });
  };

  /**
   * Filters positions based on the search term
   */
  const filterPositions = (positions: Position[], term: string): Position[] => {
    if (!term) return positions;
    const lowerTerm = term.toLowerCase();
    return positions.filter((pos) => {
      const title = pos.title?.title.toLowerCase() || "";
      const organization = pos.organization?.name.toLowerCase() || "";
      return title.includes(lowerTerm) || organization.includes(lowerTerm);
    });
  };

  // Derived filtered lists
  const filteredEmploymentHistory = filterPositions(employmentHistoryPositions, searchTerm);
  const filteredOtherPositions = filterPositions(otherPositions, searchTerm);

  /**
   * Renders the similar positions for a given position
   */
  const renderSimilarPositions = (currentPosition: Position) => {
    return (
      <div className="ml-6 mt-2">
        <h4 className="font-semibold text-lg">Similar Positions:</h4>
        {currentPosition.similarPositionUuids.length > 0 ? (
          currentPosition.similarPositionUuids.map((uuid) => {
            const similarPosition = otherPositions.find(
              (pos) => pos.positionUuid === uuid
            );
            if (!similarPosition) return null;
            return (
              <SimilarPositionCard
                key={uuid}
                position={similarPosition}
                onApprove={() =>
                  handleApproveSimilar(currentPosition.positionUuid, uuid)
                }
                onReject={() =>
                  handleRejectSimilar(currentPosition.positionUuid, uuid)
                }
                isLoading={loadingPositions.has(uuid)}
              />
            );
          })
        ) : (
          <p className="text-gray-600">No similar positions.</p>
        )}
      </div>
    );
  };

  const renderEmploymentActions = (position: Position) => (
    <div className="flex space-x-2">
      <button
        onClick={() => handleEditPosition(position)}
        className="bg-blue-500 text-white px-3 py-1 rounded flex items-center"
        disabled={loadingPositions.has(position.positionUuid)}
      >
        <FontAwesomeIcon icon={faEdit} className="mr-1" />
        Edit
      </button>
      <button
        onClick={() => handleRemoveFromEmploymentHistory(position.positionUuid)}
        className={`bg-red-500 text-white px-3 py-1 rounded flex items-center ${
          loadingPositions.has(position.positionUuid)
            ? "opacity-50 cursor-not-allowed"
            : ""
        }`}
        disabled={loadingPositions.has(position.positionUuid)}
      >
        {loadingPositions.has(position.positionUuid) ? (
          <FontAwesomeIcon icon={faSpinner} spin className="mr-1" />
        ) : (
          <FontAwesomeIcon icon={faTrash} className="mr-1" />
        )}
        Remove
      </button>
    </div>
  );

  const renderOtherActions = (position: Position) => (
    <div className="flex space-x-2">
      <button
        onClick={() => handleAddToEmploymentHistory(position.positionUuid)}
        className="bg-green-500 text-white px-3 py-1 rounded flex items-center"
        disabled={loadingPositions.has(position.positionUuid)}
      >
        {loadingPositions.has(position.positionUuid) ? (
          <FontAwesomeIcon icon={faSpinner} spin className="mr-1" />
        ) : (
          <FontAwesomeIcon icon={faCheckCircle} className="mr-1" />
        )}
        Add to Employment History
      </button>
      <button
        onClick={() => handleRejectPosition(position.positionUuid)}
        className={`bg-red-500 text-white px-3 py-1 rounded flex items-center ${
          loadingPositions.has(position.positionUuid)
            ? "opacity-50 cursor-not-allowed"
            : ""
        }`}
        disabled={loadingPositions.has(position.positionUuid)}
      >
        {loadingPositions.has(position.positionUuid) ? (
          <FontAwesomeIcon icon={faSpinner} spin className="mr-1" />
        ) : (
          <FontAwesomeIcon icon={faTrash} className="mr-1" />
        )}
        Reject
      </button>
    </div>
  );

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Review Positions</h1>
      <SearchBar searchTerm={searchTerm} onSearchChange={setSearchTerm} />

      <PositionsSection
        title="Employment History"
        filteredPositions={filteredEmploymentHistory}
        expandedPositions={expandedPositions}
        loadingPositions={loadingPositions}
        editingPositionUuid={editingPositionUuid}
        editedDetails={editedDetails}
        selectedSelections={selectedSelections}
        onToggleExpand={handleToggleExpand}
        onCheckboxChange={handleCheckboxChange}
        onSelectAll={handleSelectAll}
        onClearAll={handleClearAll}
        onEditPosition={handleEditPosition}
        onCancelEdit={handleCancelEdit}
        onSaveEdit={handleSaveEdit}
        onInputChange={handleInputChange}
        renderActions={renderEmploymentActions}
        renderSimilarPositions={renderSimilarPositions}
      />

      <PositionsSection
        title="Other Positions"
        filteredPositions={filteredOtherPositions}
        expandedPositions={expandedPositions}
        loadingPositions={loadingPositions}
        editingPositionUuid={editingPositionUuid}
        editedDetails={editedDetails}
        selectedSelections={selectedSelections}
        onToggleExpand={handleToggleExpand}
        onCheckboxChange={handleCheckboxChange}
        onSelectAll={handleSelectAll}
        onClearAll={handleClearAll}
        onEditPosition={handleEditPosition} // Not used in this section but required by props
        onCancelEdit={handleCancelEdit}
        onSaveEdit={handleSaveEdit}
        onInputChange={handleInputChange}
        renderActions={renderOtherActions}
        renderSimilarPositions={renderSimilarPositions}
      />
    </div>
  );
};

export default ReviewPositions;
