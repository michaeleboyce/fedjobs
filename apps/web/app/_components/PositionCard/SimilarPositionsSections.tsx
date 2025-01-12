// File path: apps/web/app/_components/PositionCard/SimilarPositionsSections.tsx

import React, { useState } from 'react';
import { SimilarPositionCard } from "../SimilarPositionCard";

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
