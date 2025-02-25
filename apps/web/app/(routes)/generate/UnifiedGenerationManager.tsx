// File path: apps/web/app/(routes)/generate/UnifiedGenerationManager.tsx

'use client'
import React, { useState, useCallback } from "react";
import type { Position } from "@fedjobs/types";
import { arrayMove } from "@dnd-kit/sortable";

import { useGenerationContext } from "./_Providers/GenerationProvider";

import { AdditionalInfoBox } from "./_Shared/AdditionalInfoBox";
import { GeneratePositions } from "./_Components/GeneratePositions";
import GenerateBottomBar from "./_Shared/GenerateBottomBar";
import StreamingDocumentViewer from "./_Shared/StreamingDocumentViewer";

import { createMockReader } from "@/app/_utils/mockReader";
import { DUMMY_FULL_ECQ_TEXT } from "@/app/_utils/Constants";
import { processNewECQDocument } from "@/app/_actions/files/fileActions";

import type { StreamingTextArray } from "@/app/_types/StreamingTextArray";
import type {
  GenerationSelection,
  SelectedPositionData,
} from "@/app/_types/GenerationSelection";
import type { GeneratedDocumentInformation } from "@/app/_types/GeneratedDocumentInformation";

interface UnifiedGenerationManagerProps {
  employmentHistory: Position[];
  otherPositions: Position[];
  userEmail: string;
}

export function UnifiedGenerationManager({
  employmentHistory,
  otherPositions,
  userEmail,
}: UnifiedGenerationManagerProps) {
  // Tracks position selections
  const [selectedState, setSelectedState] = useState<Record<
    string,
    { selectedActivities: number[]; selectedAccomplishments: number[] }
  >>({});

  const [isGenerateEnabled, setIsGenerateEnabled] = useState(false);

  // **Check if email is "wizrb47@gmail.com". If yes, show a model dropdown.**
  const showModelSelector = userEmail === "wizrb47@gmail.com";

  // **We keep the chosen model in state** (so it doesn't reset on paragraph regeneration).
  // Default to "o1-mini" or whichever you want as a fallback.
  const [model, setModel] = useState("claude-3-7-sonnet-20250219");

  // AI streaming states
  const [streamingTextArray, setStreamingTextArray] = useState<StreamingTextArray>([]);
  const [isStreamingComplete, setIsStreamingComplete] = useState(false);
  const [saveResult, setSaveResult] = useState({ url: "", message: "" });
  const [generatedDocuments, setGeneratedDocuments] = useState<GeneratedDocumentInformation[]>([]);

  // Access docInfo, jobInfo, otherInfo from context
  const { docInfo, jobInfo, otherInfo } = useGenerationContext();

  // Called whenever the user picks/deselects any "activities" or "accomplishments"
  const handleSelectionChange = useCallback((newSelected: typeof selectedState) => {
    setSelectedState(newSelected);

    // If any position has at least one selection, enable "Generate"
    const hasSelections = Object.values(newSelected).some(
      (pos) => pos.selectedActivities.length > 0 || pos.selectedAccomplishments.length > 0
    );
    setIsGenerateEnabled(hasSelections);
  }, []);

  // Called when user clicks "Generate" or "Regenerate Paragraph"
  async function handleGenerateClick(paragraphId?: number, regenerationText?: string) {
    // Build array of the user's chosen positions/activities/accomplishments
    const selectedPositions: SelectedPositionData[] = Object.entries(selectedState).flatMap(
      ([positionUuid, selections]) => {
        const posObj =
          employmentHistory.find((p) => p.positionUuid === positionUuid) ||
          otherPositions.find((p) => p.positionUuid === positionUuid);

        if (!posObj) return []; // skip if not found

        return [
          {
            position: posObj,
            selectedActivities: selections.selectedActivities.map(
              (i) => posObj.details.activities[i]
            ),
            selectedAccomplishments: selections.selectedAccomplishments.map(
              (i) => posObj.details.accomplishments[i]
            ),
          },
        ];
      }
    );

    if (!selectedPositions.length) {
      console.warn("No positions selected!");
      return;
    }

    const generationSelection: GenerationSelection = {
      positions: selectedPositions,
      docInfo,
      jobInfo,
      otherInfo,
      length: docInfo.length,
      lengthUnit: docInfo.lengthUnit,
    };

    // Decide which provider to call based on the chosen model
    // - If model is "claude-...", then provider = "anthropic"
    // - Else provider = "openai"
    let provider: "openai" | "anthropic";
    if (model.startsWith("claude")) {
      provider = "anthropic";
    } else {
      provider = "openai";
    }

    // If docInfo.isDummy is set, we skip the fetch call and just fake a streaming response
    let reader: ReadableStreamDefaultReader<Uint8Array>;
    let combinedOutput = "";
    let iterationCount = 0;

    if (docInfo.isDummy) {
      // Just mock a streaming response
// In UnifiedGenerationManager (or wherever you do createMockReader)
      reader = createMockReader(DUMMY_FULL_ECQ_TEXT, [5, 15]) as ReadableStreamDefaultReader<Uint8Array>;
    } else {
      // Actually call the Next.js route
      const res = await fetch(`/api/ai/generate/${docInfo.type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          generationSelection,
          streamingTextArray,
          paragraphId,
          regenerationText,
          model
        }),
      });
      if (!res.ok || !res.body) {
        console.error("Error from AI route. Possibly invalid response.");
        return;
      }
      reader = res.body.getReader();
    }

    // Reset streaming states
    setStreamingTextArray([]);
    setIsStreamingComplete(false);

    // Stream the text in a loop
    const decoder = new TextDecoder();
    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        convertToParagraphs(combinedOutput, paragraphId);
        setIsStreamingComplete(true);
        break;
      }
      combinedOutput += decoder.decode(value, { stream: true });
      iterationCount++;
      if (iterationCount % 5 === 0) {
        convertToParagraphs(combinedOutput, paragraphId);
      }
    }
  }

  // Splits text into paragraphs, or updates a single paragraph (if regenerating)
  function convertToParagraphs(text: string, paragraphId?: number) {
    if (paragraphId !== undefined) {
      setStreamingTextArray((prev) =>
        prev.map((p) => (p.id === paragraphId ? { ...p, text } : p))
      );
    } else {
      const paragraphs = text
        .split(/\n\s*\n+/) // or your own logic
        .map((txt, idx) => ({ id: idx, text: txt }));
      setStreamingTextArray(paragraphs);
    }
  }

  // Handler for saving document to database/storage
  async function handleOnSave() {
    const paragraphTexts = streamingTextArray.map(p => p.text);
    const joinedText = paragraphTexts.join("\n\n");
    
    // Example: store doc in DB
    const result = await processNewECQDocument(joinedText, "ECQ Title");
    if (result.status === "ok") {
      setSaveResult({
        url: result.body.url,
        message: "Document Successfully Saved - Click here to view",
      });
    } else {
      setSaveResult({ url: "", message: "Save error occurred" });
    }
  }

  const [selectedParagraphId, setSelectedParagraphId] = useState<number | null>(null);

  function handleParagraphSelection(paragraphId: number) {
    setSelectedParagraphId(paragraphId);
  }

  function handleParagraphTextUpdate(paragraphId: number, newText: string) {
    setStreamingTextArray(prev => 
      prev.map(p => p.id === paragraphId ? { ...p, text: newText } : p)
    );
  }

  // Functions for paragraph manipulation
  function handleParagraphDelete(paragraphId: number) {
    setStreamingTextArray(prev => prev.filter(p => p.id !== paragraphId));
  }

  function handleParagraphMove(paragraphId: number, direction: 'up' | 'down') {
    setStreamingTextArray(prev => {
      const index = prev.findIndex(p => p.id === paragraphId);
      if (index === -1) return prev;
      
      const newIndex = direction === 'up' ? Math.max(0, index - 1) : Math.min(prev.length - 1, index + 1);
      if (newIndex === index) return prev;
      
      return arrayMove(prev, index, newIndex);
    });
  }
  
  // Handle drag and drop reordering
  function handleParagraphReorder(paragraphs: string[]) {
    // Map the updated text back to the existing array with preserved IDs
    setStreamingTextArray(prev => {
      if (prev.length !== paragraphs.length) {
        console.error("Paragraph count mismatch during reordering");
        return prev;
      }
      
      return prev.map((paragraph, index) => ({
        ...paragraph,
        text: paragraphs[index]
      }));
    });
  }

  return (
    <div className="p-4">
      <AdditionalInfoBox showIsDummy={docInfo.isDummy} />
      <StreamingDocumentViewer
        streamingTextArray={streamingTextArray}
        isStreamingComplete={isStreamingComplete}
        onSave={handleParagraphReorder}
        onRegenerateParagraph={handleGenerateClick}
        onSelectParagraph={handleParagraphSelection}
        onParagraphTextUpdate={handleParagraphTextUpdate}
        onParagraphDelete={handleParagraphDelete}
        onParagraphMove={handleParagraphMove}
      />

      <GeneratePositions
        employmentHistory={employmentHistory}
        otherPositions={otherPositions}
        selectedState={selectedState}
        onSelectionChange={handleSelectionChange}
      />

      <GenerateBottomBar
        onGenerateClick={handleGenerateClick}
        isGenerateDisabled={!isGenerateEnabled}
        generatedDocuments={generatedDocuments}
        onViewDocument={(docId) => window.open(`/document/${docId}`, "_blank")}
        onSaveDocument={handleOnSave}
        isSaveEnabled={streamingTextArray.length > 0 && isStreamingComplete}
        // Pass the new props
        showModelSelector={showModelSelector}
        model={model}
        setModel={setModel}
      />
    </div>
  );
}
