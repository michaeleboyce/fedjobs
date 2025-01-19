// File: apps/web/app/(routes)/generate/UnifiedGenerationManager.tsx

"use client";

import React, { useState, useCallback } from "react";
import type { Position } from "@fedjobs/types";

import { useGenerationContext } from "./_Providers/GenerationProvider";

import { AdditionalInfoBox } from "./_Components/AdditionalInfoBox";
import { GeneratePositions } from "./_Components/GeneratePositions";
import GenerateBottomBar from "./_Components/GenerateBottomBar";
import StreamingDocumentViewer from "./_Components/StreamingDocumentViewer";

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
  const [model, setModel] = useState("claude-3-5-sonnet-20241022");

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
    // Build array of the user’s chosen positions/activities/accomplishments
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

  // Example "save" handler
  async function handleOnSave(paragraphs: string[]) {
    const joinedText = paragraphs.join("\n\n");
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

  return (
    <div className="p-4">
      <AdditionalInfoBox showIsDummy={docInfo.isDummy} />

      <StreamingDocumentViewer
        documentName="Generated Document"
        streamingTextArray={streamingTextArray}
        isStreamingComplete={isStreamingComplete}
        onSave={handleOnSave}
        saveResult={saveResult}
        onRegenerateParagraph={handleGenerateClick}
        onParagraphDelete={() => {}}
        onMoveParagraph={() => {}}
        selectedParagraph={null}
        onSelectParagraph={() => {}}
        onParagraphTextUpdate={() => {}}
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
        // Pass the new props
        showModelSelector={showModelSelector}
        model={model}
        setModel={setModel}
      />
    </div>
  );
}
