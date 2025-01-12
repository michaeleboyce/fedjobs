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
  // Removed getPositionByUuid and updatePositionFields from here
} from "@/app/_actions/positions/reviewPositionActions";
import { getPosition, updatePositionFieldsByUuid } from "@/app/_actions/positions/positionActions"; 
import { toast } from "react-toastify";

type PositionsContextType = {
  employmentHistory: Position[];
  otherPositions: Position[];
  loadingPositions: Set<string>;
  fetchPositions: () => Promise<void>;

  handleAddToEmploymentHistory: (uuid: string) => Promise<void>;
  handleRemoveFromEmploymentHistory: (uuid: string) => Promise<void>;
  handleRejectPosition: (uuid: string) => Promise<void>;
  handleApproveSimilar: (currentUuid: string, similarUuid: string) => Promise<void>;
  handleRejectSimilar: (currentUuid: string, similarUuid: string) => Promise<void>;
  handleUpdatePosition: (uuid: string, updatedFields: Partial<Position>) => Promise<void>;
  handleRemoveApprovedSimilar: (currentUuid: string, similarUuid: string) => Promise<void>;
  handleRemoveRejectedSimilar: (currentUuid: string, similarUuid: string) => Promise<void>;
};

const PositionsContext = createContext<PositionsContextType | null>(null);

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

  async function fetchPositions(): Promise<void> {
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

  function startLoading(uuid: string): void {
    setLoadingPositions((prev) => new Set(prev).add(uuid));
  }
  
  function stopLoading(uuid: string): void {
    setLoadingPositions((prev) => {
      const newSet = new Set(prev);
      newSet.delete(uuid);
      return newSet;
    });
  }

  async function handleAddToEmploymentHistory(uuid: string): Promise<void> {
    startLoading(uuid);
    try {
      const response = await addToEmploymentHistory(uuid);
      if (response.success && response.position) {
        toast.success("Position added to Employment History.");
        setEmploymentHistory((prev) => [...prev, response.position]);
      } else {
        toast.error("Failed to add to Employment History.");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to add to Employment History.");
    } finally {
      stopLoading(uuid);
    }
  }

  async function handleRemoveFromEmploymentHistory(uuid: string): Promise<void> {
    startLoading(uuid);
    try {
      const response = await removeFromEmploymentHistory(uuid);
      if (response.success) {
        toast.success(response.message || "Position removed from Employment History.");
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

  async function handleRejectPosition(uuid: string): Promise<void> {
    startLoading(uuid);
    try {
      const response = await rejectPosition(uuid);
      if (response.success) {
        toast.success(response.message || "Position rejected and deleted.");
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

  async function handleApproveSimilar(currentUuid: string, similarUuid: string): Promise<void> {
    startLoading(similarUuid);
    try {
      const response = await approveSimilarPosition(currentUuid, similarUuid);
      if (response.success) {
        toast.success("Similar position approved.");

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

  async function handleRejectSimilar(currentUuid: string, similarUuid: string): Promise<void> {
    startLoading(similarUuid);
    try {
      const response = await rejectSimilarPosition(currentUuid, similarUuid);
      if (response.success) {
        toast.success("Similar position rejected.");

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

  async function handleUpdatePosition(uuid: string, updatedFields: Partial<Position>): Promise<void> {
    startLoading(uuid);
    try {
      const response = await updatePosition(uuid, updatedFields);
      if (response.success) {
        toast.success("Position updated successfully.");
        const updatePos = (pos: Position) => {
          if (pos.positionUuid !== uuid) return pos;
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

  async function handleRemoveApprovedSimilar(currentUuid: string, similarUuid: string): Promise<void> {
    startLoading(similarUuid);
    try {
      const currentPosResponse = await getPosition(currentUuid);
      const similarPosResponse = await getPosition(similarUuid);
      if (!currentPosResponse.success || !similarPosResponse.success) {
        throw new Error("Positions not found");
      }
  
      const currentPos = currentPosResponse.position;
      const similarPos = similarPosResponse.position;
  
      // Remove the similarUuid/currentUuid from approved lists
      const updatedCurrentApproved = currentPos.approvedSimilarPositionUuids.filter(uuid => uuid !== similarUuid);
      const updatedSimilarApproved = similarPos.approvedSimilarPositionUuids.filter(uuid => uuid !== currentUuid);
  
      // Add the uuids back to the general similar bucket if not already present
      const currentSimilarSet = new Set(currentPos.similarPositionUuids);
      currentSimilarSet.add(similarUuid);
      const updatedCurrentSimilar = Array.from(currentSimilarSet);
  
      const similarSimilarSet = new Set(similarPos.similarPositionUuids);
      similarSimilarSet.add(currentUuid);
      const updatedSimilarSimilar = Array.from(similarSimilarSet);
  
      // Update the database for both positions
      await updatePositionFieldsByUuid(currentUuid, { 
        approvedSimilarPositionUuids: updatedCurrentApproved,
        similarPositionUuids: updatedCurrentSimilar
      });
      await updatePositionFieldsByUuid(similarUuid, { 
        approvedSimilarPositionUuids: updatedSimilarApproved,
        similarPositionUuids: updatedSimilarSimilar
      });
  
      // Update local state to reflect changes
      setEmploymentHistory(prev => 
        prev.map(pos => {
          if (pos.positionUuid === currentUuid) {
            return {
              ...pos,
              approvedSimilarPositionUuids: pos.approvedSimilarPositionUuids.filter(id => id !== similarUuid),
              similarPositionUuids: Array.from(new Set([...(pos.similarPositionUuids || []), similarUuid]))
            };
          }
          if (pos.positionUuid === similarUuid) {
            return {
              ...pos,
              approvedSimilarPositionUuids: pos.approvedSimilarPositionUuids.filter(id => id !== currentUuid),
              similarPositionUuids: Array.from(new Set([...(pos.similarPositionUuids || []), currentUuid]))
            };
          }
          return pos;
        })
      );
      toast.success("Approved similar position removed.");
    } catch(e: any) {
      toast.error(e.message || "Failed to remove approved similar position.");
    } finally {
      stopLoading(similarUuid);
    }
  }
  

  async function handleRemoveRejectedSimilar(currentUuid: string, similarUuid: string): Promise<void> {
    startLoading(similarUuid);
    try {
      const currentPosResponse = await getPosition(currentUuid);
      const similarPosResponse = await getPosition(similarUuid);
      if (!currentPosResponse.success || !similarPosResponse.success) {
        throw new Error("Positions not found");
      }
  
      const currentPos = currentPosResponse.position;
      const similarPos = similarPosResponse.position;
  
      // Remove the similarUuid/currentUuid from rejected lists
      const updatedCurrentRejected = currentPos.rejectedSimilarPositionUuids.filter(uuid => uuid !== similarUuid);
      const updatedSimilarRejected = similarPos.rejectedSimilarPositionUuids.filter(uuid => uuid !== currentUuid);
  
      // Add the uuids back to the general similar bucket if not already present
      const currentSimilarSet = new Set(currentPos.similarPositionUuids);
      currentSimilarSet.add(similarUuid);
      const updatedCurrentSimilar = Array.from(currentSimilarSet);
  
      const similarSimilarSet = new Set(similarPos.similarPositionUuids);
      similarSimilarSet.add(currentUuid);
      const updatedSimilarSimilar = Array.from(similarSimilarSet);
  
      // Update the database for both positions
      await updatePositionFieldsByUuid(currentUuid, { 
        rejectedSimilarPositionUuids: updatedCurrentRejected,
        similarPositionUuids: updatedCurrentSimilar
      });
      await updatePositionFieldsByUuid(similarUuid, { 
        rejectedSimilarPositionUuids: updatedSimilarRejected,
        similarPositionUuids: updatedSimilarSimilar
      });
  
      // Update local state to reflect changes
      setEmploymentHistory(prev => 
        prev.map(pos => {
          if (pos.positionUuid === currentUuid) {
            return {
              ...pos,
              rejectedSimilarPositionUuids: pos.rejectedSimilarPositionUuids.filter(id => id !== similarUuid),
              similarPositionUuids: Array.from(new Set([...(pos.similarPositionUuids || []), similarUuid]))
            };
          }
          if (pos.positionUuid === similarUuid) {
            return {
              ...pos,
              rejectedSimilarPositionUuids: pos.rejectedSimilarPositionUuids.filter(id => id !== currentUuid),
              similarPositionUuids: Array.from(new Set([...(pos.similarPositionUuids || []), currentUuid]))
            };
          }
          return pos;
        })
      );
      toast.success("Rejected similar position removed.");
    } catch(e: any) {
      toast.error(e.message || "Failed to remove rejected similar position.");
    } finally {
      stopLoading(similarUuid);
    }
  }
  

  const value: PositionsContextType = {
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
    handleRemoveApprovedSimilar,
    handleRemoveRejectedSimilar
  };

  return (
    <PositionsContext.Provider value={value}>
      {children}
    </PositionsContext.Provider>
  );
};
