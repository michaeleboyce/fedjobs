// File path: apps/web/app/features/generation/components/DocumentGeneration/index.tsx
'use client'
import { Position } from "@fedjobs/types";
import { DndContext, closestCenter } from '@dnd-kit/core';
import { ResumeObject } from "@/app/shared/types/Resume";

// Hooks
import { useDocumentGeneration } from "../../hooks/useDocumentGeneration";
import { useGenerationManagement } from "../../hooks/useGenerationManagement";

// Components
import { DocumentInfo } from "../DocumentInfo";
import { DocumentEditor } from "../DocumentEditor";
import { PositionSelector } from "../PositionSelector";
import { ActionBar } from "../ui";

interface DocumentGenerationProps {
  employmentHistory: Position[];
  otherPositions: Position[];
  resume?: ResumeObject;
  userEmail: string;
}

export function DocumentGeneration({
  employmentHistory,
  otherPositions,
  resume,
  userEmail,
}: DocumentGenerationProps) {
  // Get state from Zustand store via custom hook
  const { docInfo, jobInfo, otherInfo } = useGenerationManagement();
  
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
    resume,
    docInfo,
    jobInfo,
    otherInfo
  });

  return (
    <div className="p-4">
      {/* Document information section */}
      <DocumentInfo showIsDummy={docInfo.isDummy} />
      
      {/* Document editor section */}
      <DndContext collisionDetection={closestCenter}>
        <DocumentEditor
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
      
      {/* Position selection section */}
      <PositionSelector
        resume={resume}
        employmentHistory={employmentHistory}
        otherPositions={otherPositions}
        selectedState={selectedState}
        onSelectionChange={handleSelectionChange}
      />
      
      {/* Controls bar */}
      <ActionBar
        onGenerateClick={handleGenerateClick}
        isGenerateDisabled={!isGenerateEnabled}
        generatedDocuments={generatedDocuments}
        onViewDocument={(documentId: number) => {
          window.open(`/document/${documentId}`, "_blank");
        }}
        onSaveDocument={handleSaveDocument}
        isSaveEnabled={streamingTextArray.length > 0 && isStreamingComplete}
        showModelSelector={showModelSelector}
        model={model}
        setModel={setModel}
      />
    </div>
  );
}