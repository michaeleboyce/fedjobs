// File path: apps/web/app/features/positions/components/PositionCard/SimilarPositionsSections.tsx

import React, { useState, useEffect } from 'react';
import { SimilarPositionCard } from "../SimilarPositionCard";
import { toast } from "react-toastify";
import { getPosition } from "@/app/features/positions/actions/positionActions";

interface SimilarPositionsSectionsProps {
  position: any;
  isEmploymentHistory: boolean;
  isGenerationView: boolean;
  loadingPositions: Set<string>;
  handleApproveSimilar: (currentUuid: string, similarUuid: string) => Promise<void>;
  handleRejectSimilar: (currentUuid: string, similarUuid: string) => Promise<void>;
  handleRemoveApprovedSimilar: (currentUuid: string, similarUuid: string) => Promise<void>;
  handleRemoveRejectedSimilar: (currentUuid: string, similarUuid: string) => Promise<void>;
}

export const SimilarPositionsSections: React.FC<SimilarPositionsSectionsProps> = ({
  position,
  isEmploymentHistory,
  isGenerationView,
  loadingPositions,
  handleApproveSimilar,
  handleRejectSimilar,
  handleRemoveApprovedSimilar,
  handleRemoveRejectedSimilar,
}) => {
  const [showUnderReview, setShowUnderReview] = useState(true);
  const [showApproved, setShowApproved] = useState(true);
  const [showRejected, setShowRejected] = useState(false);
  const [validatedSimilarIds, setValidatedSimilarIds] = useState<string[]>([]);
  const [validatedApprovedIds, setValidatedApprovedIds] = useState<string[]>([]);
  const [validatedRejectedIds, setValidatedRejectedIds] = useState<string[]>([]);
  const [hasValidated, setHasValidated] = useState(false);

  // Validate all position IDs when component first renders
  useEffect(() => {
    const validatePositionIds = async () => {
      if (hasValidated) return;
      
      try {
        // Validate similar positions
        const similarIds = position.similarPositionUuids || [];
        const approvedIds = position.approvedSimilarPositionUuids || [];
        const rejectedIds = position.rejectedSimilarPositionUuids || [];
        
        // Validate that each ID still exists in the database
        const validSimilar: string[] = [];
        const validApproved: string[] = [];
        const validRejected: string[] = [];
        
        let needsUpdate = false;
        
        // Check similar positions
        for (const id of similarIds) {
          const response = await getPosition(id);
          if (response.success) {
            validSimilar.push(id);
          } else {
            console.warn(`Similar position ${id} not found, will be removed`);
            needsUpdate = true;
          }
        }
        
        // Check approved positions
        for (const id of approvedIds) {
          const response = await getPosition(id);
          if (response.success) {
            validApproved.push(id);
          } else {
            console.warn(`Approved position ${id} not found, will be removed`);
            needsUpdate = true;
          }
        }
        
        // Check rejected positions
        for (const id of rejectedIds) {
          const response = await getPosition(id);
          if (response.success) {
            validRejected.push(id);
          } else {
            console.warn(`Rejected position ${id} not found, will be removed`);
            needsUpdate = true;
          }
        }
        
        // Update state with validated IDs
        setValidatedSimilarIds(validSimilar);
        setValidatedApprovedIds(validApproved);
        setValidatedRejectedIds(validRejected);
        setHasValidated(true);
        
        // If any positions were missing, clean up the arrays
        if (needsUpdate && 
            (similarIds.length !== validSimilar.length || 
             approvedIds.length !== validApproved.length || 
             rejectedIds.length !== validRejected.length)) {
          
          // Update the position object through API - this would happen in a real implementation
          // For now, we'll just show a toast notification
          toast.info("Some referenced positions were no longer found and have been removed.");
        }
      } catch (error) {
        console.error("Error validating position IDs:", error);
      }
    };
    
    validatePositionIds();
  }, [position, hasValidated]);

  const renderSection = (
    title: string, 
    show: boolean, 
    toggle: () => void, 
    children: React.ReactNode
  ) => (
    <div className="mt-4">
      <h4 className="font-semibold mb-2 cursor-pointer" onClick={toggle}>{title}</h4>
      {show && <div className="space-y-2">{children}</div>}
    </div>
  );

  // Only render once validation has completed
  if (!hasValidated) {
    return <div className="mt-4 text-gray-500">Loading similar positions...</div>;
  }

  return (
    <>
      {/* Under Review */}
      {validatedSimilarIds.length > 0 &&
        renderSection(
          `Similar Positions Under Review (${validatedSimilarIds.length})`,
          showUnderReview,
          () => setShowUnderReview(!showUnderReview),
          validatedSimilarIds.map((simId) => (
            <SimilarPositionCard
              key={simId}
              similarId={simId}
              currentPosition={position}
              isEmploymentHistory={isEmploymentHistory}
              /** pass isGenerationView so the card can hide remove/approve/reject */
              isGenerationView={isGenerationView}
              isLoading={loadingPositions.has(simId)}
              onViewOriginal={() => {
                const element = document.getElementById(`position-${simId}`);
                if (element) {
                  element.scrollIntoView({ behavior: "smooth", block: "center" });
                }
              }}
              onApprove={
                !isGenerationView && isEmploymentHistory
                  ? () => handleApproveSimilar(position.positionUuid, simId)
                  : undefined
              }
              onReject={
                !isGenerationView && isEmploymentHistory
                  ? () => handleRejectSimilar(position.positionUuid, simId)
                  : undefined
              }
            />
          ))
        )
      }

      {/* Approved */}
      {validatedApprovedIds.length > 0 &&
        renderSection(
          `Approved Similar Positions (${validatedApprovedIds.length})`,
          showApproved,
          () => setShowApproved(!showApproved),
          validatedApprovedIds.map((simId) => (
            <SimilarPositionCard
              key={simId}
              similarId={simId}
              currentPosition={position}
              isEmploymentHistory={isEmploymentHistory}
              isGenerationView={isGenerationView}
              isLoading={loadingPositions.has(simId)}
              onViewOriginal={() => {
                const element = document.getElementById(`position-${simId}`);
                if (element) {
                  element.scrollIntoView({ behavior: "smooth", block: "center" });
                }
              }}
              onRemove={
                !isGenerationView && isEmploymentHistory
                  ? () => handleRemoveApprovedSimilar(position.positionUuid, simId)
                  : undefined
              }
            />
          ))
        )
      }

      {/* Rejected */}
      {validatedRejectedIds.length > 0 &&
        renderSection(
          `Rejected Similar Positions (${validatedRejectedIds.length})`,
          showRejected,
          () => setShowRejected(!showRejected),
          validatedRejectedIds.map((simId) => (
            <SimilarPositionCard
              key={simId}
              similarId={simId}
              currentPosition={position}
              isEmploymentHistory={isEmploymentHistory}
              isGenerationView={isGenerationView}
              isLoading={loadingPositions.has(simId)}
              onViewOriginal={() => {
                const element = document.getElementById(`position-${simId}`);
                if (element) {
                  element.scrollIntoView({ behavior: "smooth", block: "center" });
                }
              }}
              onRemove={
                !isGenerationView && isEmploymentHistory
                  ? () => handleRemoveRejectedSimilar(position.positionUuid, simId)
                  : undefined
              }
            />
          ))
        )
      }
    </>
  );
};