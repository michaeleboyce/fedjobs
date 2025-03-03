'use client';

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { Position } from '@fedjobs/types';
import { toast } from 'react-toastify';
import {
  getAllPositions,
  addToEmploymentHistory,
  removeFromEmploymentHistory,
  updatePosition,
  approveSimilarPosition,
  rejectSimilarPosition,
  rejectPosition,
} from '@/app/features/positions/actions/reviewPositionActions';
import { getPosition, updatePositionFieldsByUuid } from '@/app/features/positions/actions/positionActions';
import { enableMapSet } from 'immer';

interface PositionsState {
  employmentHistory: Position[];
  otherPositions: Position[];
  loadingPositions: Set<string>;
  isLoading: boolean;
  error: string | null;
}

interface PositionsActions {
  // Data fetching
  fetchPositions: () => Promise<void>;
  
  // Position management
  addToEmploymentHistory: (uuid: string) => Promise<void>;
  removeFromEmploymentHistory: (uuid: string) => Promise<void>;
  rejectPosition: (uuid: string) => Promise<void>;
  updatePosition: (uuid: string, updatedFields: Partial<Position>) => Promise<void>;
  
  // Similar positions management
  approveSimilar: (currentUuid: string, similarUuid: string) => Promise<void>;
  rejectSimilar: (currentUuid: string, similarUuid: string) => Promise<void>;
  removeApprovedSimilar: (currentUuid: string, similarUuid: string) => Promise<void>;
  removeRejectedSimilar: (currentUuid: string, similarUuid: string) => Promise<void>;
  
  // Loading state management
  startLoading: (uuid: string) => void;
  stopLoading: (uuid: string) => void;
}

enableMapSet();

export const usePositionsStore = create<PositionsState & PositionsActions>()(
  immer((set, get) => ({
    // Initial state
    employmentHistory: [],
    otherPositions: [],
    loadingPositions: new Set<string>(),
    isLoading: false,
    error: null,

    // Helper functions for loading state
    startLoading: (uuid: string) => {
      set(state => {
        state.loadingPositions.add(uuid);
      });
    },

    stopLoading: (uuid: string) => {
      set(state => {
        state.loadingPositions.delete(uuid);
      });
    },

    // Fetch all positions from API
    fetchPositions: async () => {
      set(state => {
        state.isLoading = true;
        state.error = null;
      });

      try {
        const response = await getAllPositions();
        
        if (response.success) {
          set(state => {
            state.employmentHistory = response.employmentHistory;
            state.otherPositions = response.otherPositions;
            state.isLoading = false;
          });
        } else {
          set(state => {
            state.error = response.error;
            state.isLoading = false;
          });
          toast.error(response.error);
        }
      } catch (error: any) {
        set(state => {
          state.error = error.message || 'Error fetching positions.';
          state.isLoading = false;
        });
        console.error('Error fetching positions:', error);
        toast.error('Error fetching positions.');
      }
    },

    // Add position to employment history
    addToEmploymentHistory: async (uuid: string) => {
      get().startLoading(uuid);
      
      try {
        const response = await addToEmploymentHistory(uuid);
        
        if (response.success && response.position) {
          set(state => {
            // Add to employment history
            state.employmentHistory.push(response.position);
          });
          toast.success('Position added to Employment History.');
        } else {
          toast.error('Failed to add to Employment History.');
        }
      } catch (error: any) {
        toast.error(error.message || 'Failed to add to Employment History.');
      } finally {
        get().stopLoading(uuid);
      }
    },

    // Remove from employment history
    removeFromEmploymentHistory: async (uuid: string) => {
      get().startLoading(uuid);
      
      try {
        const response = await removeFromEmploymentHistory(uuid);
        
        if (response.success) {
          set(state => {
            // Remove from employment history
            state.employmentHistory = state.employmentHistory.filter(
              (pos) => pos.positionUuid !== uuid
            );
          });
          toast.success(response.message || 'Position removed from Employment History.');
        } else {
          toast.error(response.error || 'Failed to remove from Employment History.');
        }
      } catch (error: any) {
        toast.error(error.message || 'Failed to remove position.');
      } finally {
        get().stopLoading(uuid);
      }
    },

    // Reject position
    rejectPosition: async (uuid: string) => {
      get().startLoading(uuid);
      
      try {
        const response = await rejectPosition(uuid);
        
        if (response.success) {
          set(state => {
            // Remove from both arrays
            state.employmentHistory = state.employmentHistory.filter(
              (pos) => pos.positionUuid !== uuid
            );
            state.otherPositions = state.otherPositions.filter(
              (pos) => pos.positionUuid !== uuid
            );
          });
          toast.success(response.message || 'Position rejected and deleted.');
        } else {
          toast.error(response.error || 'Failed to reject position.');
        }
      } catch (error: any) {
        toast.error(error.message || 'Failed to reject position.');
      } finally {
        get().stopLoading(uuid);
      }
    },

    // Update position
    updatePosition: async (uuid: string, updatedFields: Partial<Position>) => {
      get().startLoading(uuid);
      
      try {
        const response = await updatePosition(uuid, updatedFields);
        
        if (response.success) {
          set(state => {
            // Update position in both arrays
            const updatePos = (pos: Position) => {
              if (pos.positionUuid !== uuid) return pos;
              return { ...pos, ...updatedFields };
            };
            
            state.employmentHistory = state.employmentHistory.map(updatePos);
            state.otherPositions = state.otherPositions.map(updatePos);
          });
          toast.success('Position updated successfully.');
        } else {
          toast.error(response.error || 'Failed to update position.');
        }
      } catch (error: any) {
        toast.error(error.message || 'Failed to update position.');
      } finally {
        get().stopLoading(uuid);
      }
    },

    // Approve similar position
    approveSimilar: async (currentUuid: string, similarUuid: string) => {
      get().startLoading(similarUuid);
      
      try {
        const response = await approveSimilarPosition(currentUuid, similarUuid);
        
        if (response.success) {
          set(state => {
            // Update in both arrays with a helper function
            const updatePositionsArray = (positions: Position[]) => 
              positions.map(pos => {
                if (pos.positionUuid === currentUuid) {
                  return {
                    ...pos,
                    approvedSimilarPositionUuids: [
                      ...(pos.approvedSimilarPositionUuids || []),
                      similarUuid,
                    ],
                    similarPositionUuids: pos.similarPositionUuids.filter(
                      id => id !== similarUuid
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
                      id => id !== currentUuid
                    ),
                  };
                }
                return pos;
              });
            
            // Update both arrays
            state.employmentHistory = updatePositionsArray(state.employmentHistory);
            state.otherPositions = updatePositionsArray(state.otherPositions);
          });
          toast.success('Similar position approved.');
        } else {
          toast.error(response.error || 'Failed to approve similar position.');
        }
      } catch (error: any) {
        toast.error(error.message || 'Failed to approve similar position.');
      } finally {
        get().stopLoading(similarUuid);
      }
    },

    // Reject similar position
    rejectSimilar: async (currentUuid: string, similarUuid: string) => {
      get().startLoading(similarUuid);
      
      try {
        const response = await rejectSimilarPosition(currentUuid, similarUuid);
        
        if (response.success) {
          set(state => {
            // Update in both arrays with a helper function
            const updatePositionsArray = (positions: Position[]) => 
              positions.map(pos => {
                if (pos.positionUuid === currentUuid) {
                  return {
                    ...pos,
                    rejectedSimilarPositionUuids: [
                      ...(pos.rejectedSimilarPositionUuids || []),
                      similarUuid,
                    ],
                    similarPositionUuids: pos.similarPositionUuids.filter(
                      id => id !== similarUuid
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
                      id => id !== currentUuid
                    ),
                  };
                }
                return pos;
              });
            
            // Update both arrays
            state.employmentHistory = updatePositionsArray(state.employmentHistory);
            state.otherPositions = updatePositionsArray(state.otherPositions);
          });
          toast.success('Similar position rejected.');
        } else {
          toast.error(response.error || 'Failed to reject similar position.');
        }
      } catch (error: any) {
        toast.error(error.message || 'Failed to reject similar position.');
      } finally {
        get().stopLoading(similarUuid);
      }
    },

    // Remove approved similar position
    removeApprovedSimilar: async (currentUuid: string, similarUuid: string) => {
      get().startLoading(similarUuid);
      
      try {
        const currentPosResponse = await getPosition(currentUuid);
        const similarPosResponse = await getPosition(similarUuid);
        
        if (!currentPosResponse.success || !similarPosResponse.success) {
          throw new Error('Positions not found');
        }
        
        const currentPos = currentPosResponse.position;
        const similarPos = similarPosResponse.position;
        
        // Remove from approved lists and add back to similar lists
        const updatedCurrentApproved = currentPos.approvedSimilarPositionUuids.filter(
          uuid => uuid !== similarUuid
        );
        const updatedSimilarApproved = similarPos.approvedSimilarPositionUuids.filter(
          uuid => uuid !== currentUuid
        );
        
        // Add back to similar lists if not already present
        const currentSimilarSet = new Set(currentPos.similarPositionUuids);
        currentSimilarSet.add(similarUuid);
        const updatedCurrentSimilar = Array.from(currentSimilarSet);
        
        const similarSimilarSet = new Set(similarPos.similarPositionUuids);
        similarSimilarSet.add(currentUuid);
        const updatedSimilarSimilar = Array.from(similarSimilarSet);
        
        // Update both positions in the database
        await updatePositionFieldsByUuid(currentUuid, {
          approvedSimilarPositionUuids: updatedCurrentApproved,
          similarPositionUuids: updatedCurrentSimilar,
        });
        
        await updatePositionFieldsByUuid(similarUuid, {
          approvedSimilarPositionUuids: updatedSimilarApproved,
          similarPositionUuids: updatedSimilarSimilar,
        });
        
        // Update the local state
        set(state => {
          // Helper function to update a position in an array
          const updatePositionsArray = (positions: Position[]) => 
            positions.map(pos => {
              if (pos.positionUuid === currentUuid) {
                return {
                  ...pos,
                  approvedSimilarPositionUuids: pos.approvedSimilarPositionUuids.filter(
                    id => id !== similarUuid
                  ),
                  similarPositionUuids: Array.from(
                    new Set([...(pos.similarPositionUuids || []), similarUuid])
                  ),
                };
              }
              if (pos.positionUuid === similarUuid) {
                return {
                  ...pos,
                  approvedSimilarPositionUuids: pos.approvedSimilarPositionUuids.filter(
                    id => id !== currentUuid
                  ),
                  similarPositionUuids: Array.from(
                    new Set([...(pos.similarPositionUuids || []), currentUuid])
                  ),
                };
              }
              return pos;
            });
          
          // Update both arrays
          state.employmentHistory = updatePositionsArray(state.employmentHistory);
          state.otherPositions = updatePositionsArray(state.otherPositions);
        });
        
        toast.success('Approved similar position removed.');
      } catch (error: any) {
        toast.error(error.message || 'Failed to remove approved similar position.');
      } finally {
        get().stopLoading(similarUuid);
      }
    },

    // Remove rejected similar position
    removeRejectedSimilar: async (currentUuid: string, similarUuid: string) => {
      get().startLoading(similarUuid);
      
      try {
        const currentPosResponse = await getPosition(currentUuid);
        const similarPosResponse = await getPosition(similarUuid);
        
        if (!currentPosResponse.success || !similarPosResponse.success) {
          throw new Error('Positions not found');
        }
        
        const currentPos = currentPosResponse.position;
        const similarPos = similarPosResponse.position;
        
        // Remove from rejected lists and add back to similar lists
        const updatedCurrentRejected = currentPos.rejectedSimilarPositionUuids.filter(
          uuid => uuid !== similarUuid
        );
        const updatedSimilarRejected = similarPos.rejectedSimilarPositionUuids.filter(
          uuid => uuid !== currentUuid
        );
        
        // Add back to similar lists if not already present
        const currentSimilarSet = new Set(currentPos.similarPositionUuids);
        currentSimilarSet.add(similarUuid);
        const updatedCurrentSimilar = Array.from(currentSimilarSet);
        
        const similarSimilarSet = new Set(similarPos.similarPositionUuids);
        similarSimilarSet.add(currentUuid);
        const updatedSimilarSimilar = Array.from(similarSimilarSet);
        
        // Update both positions in the database
        await updatePositionFieldsByUuid(currentUuid, {
          rejectedSimilarPositionUuids: updatedCurrentRejected,
          similarPositionUuids: updatedCurrentSimilar,
        });
        
        await updatePositionFieldsByUuid(similarUuid, {
          rejectedSimilarPositionUuids: updatedSimilarRejected,
          similarPositionUuids: updatedSimilarSimilar,
        });
        
        // Update the local state
        set(state => {
          // Helper function to update a position in an array
          const updatePositionsArray = (positions: Position[]) => 
            positions.map(pos => {
              if (pos.positionUuid === currentUuid) {
                return {
                  ...pos,
                  rejectedSimilarPositionUuids: pos.rejectedSimilarPositionUuids.filter(
                    id => id !== similarUuid
                  ),
                  similarPositionUuids: Array.from(
                    new Set([...(pos.similarPositionUuids || []), similarUuid])
                  ),
                };
              }
              if (pos.positionUuid === similarUuid) {
                return {
                  ...pos,
                  rejectedSimilarPositionUuids: pos.rejectedSimilarPositionUuids.filter(
                    id => id !== currentUuid
                  ),
                  similarPositionUuids: Array.from(
                    new Set([...(pos.similarPositionUuids || []), currentUuid])
                  ),
                };
              }
              return pos;
            });
          
          // Update both arrays
          state.employmentHistory = updatePositionsArray(state.employmentHistory);
          state.otherPositions = updatePositionsArray(state.otherPositions);
        });
        
        toast.success('Rejected similar position removed.');
      } catch (error: any) {
        toast.error(error.message || 'Failed to remove rejected similar position.');
      } finally {
        get().stopLoading(similarUuid);
      }
    },
  }))
);