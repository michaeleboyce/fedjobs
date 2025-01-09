// File path: apps/web/app/_components/PositionCard/Context/PositionsContext.tsx

"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Position } from "@fedjobs/types";
import {
  getAllPositions,
  addToEmploymentHistory,
  removeFromEmploymentHistory,
  updatePosition,
  approveSimilarPosition,
  rejectSimilarPosition,
  rejectPosition,
} from "@/app/_actions/positions/reviewPositionActions";
import { toast } from "react-toastify";

/**
 * Define the shape of our PositionsContext
 */
type PositionsContextType = {
  employmentHistory: Position[];
  otherPositions: Position[];
  loadingPositions: Set<string>; // Track loading states by UUID
  fetchPositions: () => Promise<void>;

  // Action methods
  handleAddToEmploymentHistory: (uuid: string) => Promise<void>;
  handleRemoveFromEmploymentHistory: (uuid: string) => Promise<void>;
  handleRejectPosition: (uuid: string) => Promise<void>;
  handleApproveSimilar: (currentUuid: string, similarUuid: string) => Promise<void>;
  handleRejectSimilar: (currentUuid: string, similarUuid: string) => Promise<void>;
  handleUpdatePosition: (uuid: string, updatedFields: Partial<Position>) => Promise<void>;
};

/** Create the context **/
const PositionsContext = createContext<PositionsContextType | null>(null);

/** Hook for components to consume the context data **/
export function usePositions() {
  const ctx = useContext(PositionsContext);
  if (!ctx) {
    throw new Error("usePositions must be used within a PositionsProvider");
  }
  return ctx;
}

export const PositionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [employmentHistory, setEmploymentHistory] = useState<Position[]>([]);
  const [otherPositions, setOtherPositions] = useState<Position[]>([]);
  const [loadingPositions, setLoadingPositions] = useState<Set<string>>(new Set());

  /**
   * Fetch all positions initially
   */
  async function fetchPositions() {
    try {
      const response = await getAllPositions();
      if (response.success) {
        setEmploymentHistory(response.employmentHistory);
        setOtherPositions(response.otherPositions);
      } else {
        toast.error(response.error);
      }
    } catch (error: any) {
      console.error("Error fetching positions:", error);
      toast.error("Error fetching positions.");
    }
  }

  useEffect(() => {
    fetchPositions();
  }, []);

  /**
   * Shared helper to set loading state
   */
  function startLoading(uuid: string) {
    setLoadingPositions((prev) => new Set(prev).add(uuid));
  }
  function stopLoading(uuid: string) {
    setLoadingPositions((prev) => {
      const newSet = new Set(prev);
      newSet.delete(uuid);
      return newSet;
    });
  }

  /**
   * Action: Add to Employment History
   */
  async function handleAddToEmploymentHistory(uuid: string) {
    startLoading(uuid);
    try {
      const response = await addToEmploymentHistory(uuid);
      if (response.success && response.position) {
        toast.success("Position added to Employment History.");
        // Move that position from otherPositions to employmentHistory
        setEmploymentHistory((prev) => [...prev, response.position]);
        setOtherPositions((prev) =>
          prev.filter((pos) => pos.positionUuid !== uuid)
        );
      } else {
        toast.error("Failed to add to Employment History.");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to add to Employment History.");
    } finally {
      stopLoading(uuid);
    }
  }

  /**
   * Action: Remove from Employment History
   */
  async function handleRemoveFromEmploymentHistory(uuid: string) {
    startLoading(uuid);
    try {
      const response = await removeFromEmploymentHistory(uuid);
      if (response.success) {
        toast.success(response.message || "Position removed from Employment History.");
        // Filter it out from employmentHistory
        setEmploymentHistory((prev) => prev.filter((pos) => pos.positionUuid !== uuid));
      } else {
        toast.error(response.error || "Failed to remove from Employment History.");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to remove position.");
    } finally {
      stopLoading(uuid);
    }
  }

  /**
   * Action: Reject (delete) a position
   */
  async function handleRejectPosition(uuid: string) {
    startLoading(uuid);
    try {
      const response = await rejectPosition(uuid);
      if (response.success) {
        toast.success(response.message || "Position rejected and deleted.");
        // Remove from both arrays if present
        setEmploymentHistory((prev) => prev.filter((pos) => pos.positionUuid !== uuid));
        setOtherPositions((prev) => prev.filter((pos) => pos.positionUuid !== uuid));
      } else {
        toast.error(response.error || "Failed to reject position.");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to reject position.");
    } finally {
      stopLoading(uuid);
    }
  }

  /**
   * Action: Approve Similar
   */
  async function handleApproveSimilar(currentUuid: string, similarUuid: string) {
    startLoading(similarUuid);
    try {
      const response = await approveSimilarPosition(currentUuid, similarUuid);
      if (response.success) {
        toast.success("Similar position approved.");

        // Local state updates:
        // 1) Update employmentHistory array
        setEmploymentHistory((prev) =>
          prev.map((pos) => {
            if (pos.positionUuid === currentUuid) {
              return {
                ...pos,
                approvedSimilarPositionUuids: [
                  ...(pos.approvedSimilarPositionUuids || []),
                  similarUuid,
                ],
                similarPositionUuids: pos.similarPositionUuids.filter(
                  (id) => id !== similarUuid
                ),
              };
            }
            if (pos.positionUuid === similarUuid) {
              return {
                ...pos,
                approvedSimilarPositionUuids: [
                  ...(pos.approvedSimilarPositionUuids || []),
                  currentUuid,
                ],
                similarPositionUuids: pos.similarPositionUuids.filter(
                  (id) => id !== currentUuid
                ),
              };
            }
            return pos;
          })
        );
        // 2) Update otherPositions array
        setOtherPositions((prev) =>
          prev.map((pos) => {
            if (pos.positionUuid === currentUuid) {
              return {
                ...pos,
                approvedSimilarPositionUuids: [
                  ...(pos.approvedSimilarPositionUuids || []),
                  similarUuid,
                ],
                similarPositionUuids: pos.similarPositionUuids.filter(
                  (id) => id !== similarUuid
                ),
              };
            }
            if (pos.positionUuid === similarUuid) {
              return {
                ...pos,
                approvedSimilarPositionUuids: [
                  ...(pos.approvedSimilarPositionUuids || []),
                  currentUuid,
                ],
                similarPositionUuids: pos.similarPositionUuids.filter(
                  (id) => id !== currentUuid
                ),
              };
            }
            return pos;
          })
        );
      } else {
        toast.error(response.error || "Failed to approve similar position.");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to approve similar position.");
    } finally {
      stopLoading(similarUuid);
    }
  }

  /**
   * Action: Reject Similar
   */
  async function handleRejectSimilar(currentUuid: string, similarUuid: string) {
    startLoading(similarUuid);
    try {
      const response = await rejectSimilarPosition(currentUuid, similarUuid);
      if (response.success) {
        toast.success("Similar position rejected.");

        // Local state updates:
        setEmploymentHistory((prev) =>
          prev.map((pos) => {
            if (pos.positionUuid === currentUuid) {
              return {
                ...pos,
                rejectedSimilarPositionUuids: [
                  ...(pos.rejectedSimilarPositionUuids || []),
                  similarUuid,
                ],
                similarPositionUuids: pos.similarPositionUuids.filter(
                  (id) => id !== similarUuid
                ),
              };
            }
            if (pos.positionUuid === similarUuid) {
              return {
                ...pos,
                rejectedSimilarPositionUuids: [
                  ...(pos.rejectedSimilarPositionUuids || []),
                  currentUuid,
                ],
                similarPositionUuids: pos.similarPositionUuids.filter(
                  (id) => id !== currentUuid
                ),
              };
            }
            return pos;
          })
        );
        setOtherPositions((prev) =>
          prev.map((pos) => {
            if (pos.positionUuid === currentUuid) {
              return {
                ...pos,
                rejectedSimilarPositionUuids: [
                  ...(pos.rejectedSimilarPositionUuids || []),
                  similarUuid,
                ],
                similarPositionUuids: pos.similarPositionUuids.filter(
                  (id) => id !== similarUuid
                ),
              };
            }
            if (pos.positionUuid === similarUuid) {
              return {
                ...pos,
                rejectedSimilarPositionUuids: [
                  ...(pos.rejectedSimilarPositionUuids || []),
                  currentUuid,
                ],
                similarPositionUuids: pos.similarPositionUuids.filter(
                  (id) => id !== currentUuid
                ),
              };
            }
            return pos;
          })
        );
      } else {
        toast.error(response.error || "Failed to reject similar position.");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to reject similar position.");
    } finally {
      stopLoading(similarUuid);
    }
  }

  /**
   * Action: Update a position (inline edit)
   */
  async function handleUpdatePosition(uuid: string, updatedFields: Partial<Position>) {
    startLoading(uuid);
    try {
      const response = await updatePosition(uuid, updatedFields);
      if (response.success) {
        toast.success("Position updated successfully.");
        // Update local state
        // Just replicate the logic for both arrays
        const updatePos = (pos: Position) => {
          if (pos.positionUuid !== uuid) return pos;
          // Merge old and new data
          return { ...pos, ...updatedFields };
        };
        setEmploymentHistory((prev) => prev.map(updatePos));
        setOtherPositions((prev) => prev.map(updatePos));
      } else {
        toast.error(response.error || "Failed to update position.");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to update position.");
    } finally {
      stopLoading(uuid);
    }
  }

  const value = {
    employmentHistory,
    otherPositions,
    loadingPositions,
    fetchPositions,
    handleAddToEmploymentHistory,
    handleRemoveFromEmploymentHistory,
    handleRejectPosition,
    handleApproveSimilar,
    handleRejectSimilar,
    handleUpdatePosition,
  };

  return (
    <PositionsContext.Provider value={value}>
      {children}
    </PositionsContext.Provider>
  );
};
