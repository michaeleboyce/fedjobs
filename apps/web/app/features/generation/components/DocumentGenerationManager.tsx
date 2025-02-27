'use client'
import React from "react";
import { Position } from "@fedjobs/types";
import { DndContext, closestCenter } from '@dnd-kit/core';

// Hooks and context
import { useGenerationContext } from "../providers/GenerationProvider";
import { useDocumentGeneration } from "@/app/features/generation/hooks/useDocumentGeneration";

// Components
import { AdditionalInfoBox } from "./_Shared/AdditionalInfoBox";
import { GeneratePositions } from "./GeneratePositions";
import GenerateBottomBar from "./_Shared/GenerateBottomBar";
import StreamingDocumentViewer from "./_Shared/StreamingDocumentViewer";
import { Resume } from "@/app/features/resume/components/ResumeView";
import { ResumeObject } from "@/app/shared/types/Resume";

// Constants
import { DUMMY_FULL_ECQ_TEXT, DUMMY_ECQ_PARAGRAPH_TEXT } from "@/app/shared/utils/Constants";

interface DocumentGenerationManagerProps {
  employmentHistory: Position[];
  otherPositions: Position[];
  resume?: ResumeObject;
  userEmail: string;
}

export function DocumentGenerationManager({
  employmentHistory,
  otherPositions,
  resume,
  userEmail,
}: DocumentGenerationManagerProps) {
  // Access context for global generation settings
  const { docInfo, jobInfo, otherInfo } = useGenerationContext();

  // Determine if should show model selector (add admin emails as needed)
  const showModelSelector = userEmail === "wizrb47@gmail.com";

  // Use shared generation hook for all business logic
  const {
    selectedState,
    isGenerateEnabled,
    streamingTextArray,
    isStreamingComplete,
    selectedParagraphId,
    saveResult,
    generatedDocuments,
    model,
    setModel,
    
    handleSelectionChange,
    handleGenerateClick,
    handleSaveDocument,
    handleParagraphSelection,
    handleParagraphTextUpdate,
    handleParagraphDelete,
    handleParagraphMove,
    handleParagraphReorder,
  } = useDocumentGeneration({
    employmentHistory,
    otherPositions,
    docInfo,
    jobInfo,
    otherInfo,
    dummyText: DUMMY_FULL_ECQ_TEXT,
    paragraphDummyText: DUMMY_ECQ_PARAGRAPH_TEXT
  });

  return (
    <div className="p-4">
      {/* Information inputs */}
      <AdditionalInfoBox showIsDummy={docInfo.isDummy} />
      
      {/* Document viewer/editor */}
      <DndContext collisionDetection={closestCenter}>
        <StreamingDocumentViewer
          streamingTextArray={streamingTextArray}
          isStreamingComplete={isStreamingComplete}
          onSave={handleParagraphReorder}
          saveResult={saveResult}
          onRegenerateParagraph={handleGenerateClick}
          onSelectParagraph={handleParagraphSelection}
          onParagraphTextUpdate={handleParagraphTextUpdate}
          onParagraphDelete={handleParagraphDelete}
          onMoveParagraph={handleParagraphMove}
          selectedParagraph={selectedParagraphId}
        />
      </DndContext>

      {/* Position selection */}
      {resume ? (
        <Resume
          resume={resume}
          onSelectionChange={newState => {
            // Convert Resume component selection format to our internal format
            const mappedSelection = newState.positions.reduce((acc, curr, idx) => {
              acc[curr.position.positionUuid] = {
                selectedActivities: curr.selectedActivities,
                selectedAccomplishments: curr.selectedAccomplishments
              };
              return acc;
            }, {} as Record<string, { selectedActivities: number[], selectedAccomplishments: number[] }>);
            
            handleSelectionChange(mappedSelection);
          }}
          isViewOnly={false}
        />
      ) : (
        <GeneratePositions
          employmentHistory={employmentHistory}
          otherPositions={otherPositions}
          selectedState={selectedState}
          onSelectionChange={handleSelectionChange}
        />
      )}

      {/* Bottom controls */}
      <GenerateBottomBar
        onGenerateClick={handleGenerateClick}
        isGenerateDisabled={!isGenerateEnabled}
        generatedDocuments={generatedDocuments}
        onViewDocument={(docId) => window.open(`/document/${docId}`, "_blank")}
        onSaveDocument={handleSaveDocument}
        isSaveEnabled={streamingTextArray.length > 0 && isStreamingComplete}
        showModelSelector={showModelSelector}
        model={model}
        setModel={setModel}
      />
    </div>
  );
}