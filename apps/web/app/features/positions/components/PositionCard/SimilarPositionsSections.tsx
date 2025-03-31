// File path: apps/web/app/features/positions/components/PositionCard/SimilarPositionsSections.tsx
import React, { useState } from 'react';
import { SimilarPositionCard } from "../SimilarPositionCard";

interface SimilarPositionsSectionsProps {
  position: any;
  isEmploymentHistory: boolean;
  isGenerationView: boolean;
  loadingPositions: (id: string) => boolean;
  handleApproveSimilar: (currentUuid: string, similarUuid: string) => Promise<void>;
  handleRejectSimilar: (currentUuid: string, similarUuid: string) => Promise<void>;
  handleRemoveApprovedSimilar: (currentUuid: string, similarUuid: string) => Promise<void>;
  handleRemoveRejectedSimilar: (currentUuid: string, similarUuid: string) => Promise<void>;
  // New prop to force the filter off
  forceShowAll?: () => void;
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
  forceShowAll,
}) => {
  const [showUnderReview, setShowUnderReview] = useState(true);
  const [showApproved, setShowApproved] = useState(true);
  const [showRejected, setShowRejected] = useState(false);

  // Helper function for positions that require forcing the filter off (approved/rejected)
  const viewOriginalWithForce = (simId: string) => {
    if (!isEmploymentHistory && forceShowAll) {
      forceShowAll();
    }
    const element = document.getElementById(`position-${simId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  // Helper function for under review positions (no force required)
  const viewOriginal = (simId: string) => {
    const element = document.getElementById(`position-${simId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

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

  return (
    <>
      {/* Under Review */}
      {position.similarPositionUuids && position.similarPositionUuids.length > 0 &&
        renderSection(
          "Similar Positions Under Review:",
          showUnderReview,
          () => setShowUnderReview(!showUnderReview),
          position.similarPositionUuids.map((simId: string) => (
            <SimilarPositionCard
              key={simId}
              similarId={simId}
              currentPosition={position}
              isEmploymentHistory={isEmploymentHistory}
              isGenerationView={isGenerationView}
              isLoading={loadingPositions(simId)}
              onViewOriginal={() => viewOriginal(simId)}
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
      {position.approvedSimilarPositionUuids && position.approvedSimilarPositionUuids.length > 0 &&
        renderSection(
          "Approved Similar Positions:",
          showApproved,
          () => setShowApproved(!showApproved),
          position.approvedSimilarPositionUuids.map((simId: string) => (
            <SimilarPositionCard
              key={simId}
              similarId={simId}
              currentPosition={position}
              isEmploymentHistory={isEmploymentHistory}
              isGenerationView={isGenerationView}
              isLoading={loadingPositions(simId)}
              onViewOriginal={() => viewOriginalWithForce(simId)}
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
      {position.rejectedSimilarPositionUuids && position.rejectedSimilarPositionUuids.length > 0 &&
        renderSection(
          "Rejected Similar Positions:",
          showRejected,
          () => setShowRejected(!showRejected),
          position.rejectedSimilarPositionUuids.map((simId: string) => (
            <SimilarPositionCard
              key={simId}
              similarId={simId}
              currentPosition={position}
              isEmploymentHistory={isEmploymentHistory}
              isGenerationView={isGenerationView}
              isLoading={loadingPositions(simId)}
              onViewOriginal={() => viewOriginalWithForce(simId)}
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
