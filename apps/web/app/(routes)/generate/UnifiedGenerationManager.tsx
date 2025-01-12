// File path: apps/web/app/(routes)/generate/UnifiedGenerationManager.tsx
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
import type { GenerationSelection, SelectedPositionData } from "@/app/_types/GenerationSelection";
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
  // A map of { positionUuid: { selectedActivities: number[], selectedAccomplishments: number[] }}
  const [selectedState, setSelectedState] = useState<Record<
    string,
    { selectedActivities: number[]; selectedAccomplishments: number[] }
  > >({});

  const [isGenerateEnabled, setIsGenerateEnabled] = useState(false);

  // Streaming states
  const [streamingTextArray, setStreamingTextArray] = useState<StreamingTextArray>([]);
  const [isStreamingComplete, setIsStreamingComplete] = useState(false);
  const [saveResult, setSaveResult] = useState({ url: "", message: "" });
  const [generatedDocuments, setGeneratedDocuments] = useState<GeneratedDocumentInformation[]>([]);

  // Access docInfo, jobInfo, otherInfo from context
  const { docInfo, jobInfo, otherInfo } = useGenerationContext();

  const handleSelectionChange = useCallback((newSelected: typeof selectedState) => {
    setSelectedState(newSelected);

    // If any position has a selection
    const hasSelections = Object.values(newSelected).some(
      (pos) => pos.selectedActivities.length > 0 || pos.selectedAccomplishments.length > 0
    );
    setIsGenerateEnabled(hasSelections);
  }, []);

  async function handleGenerateClick(paragraphId?: number, regenerationText?: string) {
    // Convert your selectedState to an array of SelectedPositionData
    const selectedPositions: SelectedPositionData[] = Object.entries(selectedState).flatMap(
      ([positionUuid, selections]) => {
        const positionObj =
          employmentHistory.find((p) => p.positionUuid === positionUuid) ||
          otherPositions.find((p) => p.positionUuid === positionUuid);

        if (!positionObj) return []; // skip if not found

        return [
          {
            position: positionObj, 
            selectedActivities: selections.selectedActivities.map(
              (idx) => positionObj.details.activities[idx]
            ),
            selectedAccomplishments: selections.selectedAccomplishments.map(
              (idx) => positionObj.details.accomplishments[idx]
            ),
          },
        ];
      }
    );

    if (!selectedPositions.length) {
      console.error("No positions selected!");
      return;
    }

    // Prepare a GenerationSelection
    const generationSelection: GenerationSelection = {
      positions: selectedPositions,
      docInfo,        // from context
      jobInfo,        // from context
      otherInfo,      // from context
      length: docInfo.length,
      lengthUnit: docInfo.lengthUnit,
    };

    // streaming logic
    let reader;
    let combinedOutput = "";
    let iterationCount = 0;

    if (docInfo.isDummy) {
      // mock
      reader = createMockReader(DUMMY_FULL_ECQ_TEXT, [5, 15]);
    } else {
      const res = await fetch(`/api/ai/generate/${docInfo.type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ generationSelection, streamingTextArray, paragraphId, regenerationText }),
      });
      if (!res.ok || !res.body) {
        console.error("No response or not OK");
        return;
      }
      reader = res.body.getReader();
    }
    setStreamingTextArray([]);
    setIsStreamingComplete(false);

    const decoder = new TextDecoder("utf8");
    while (true) {
      const result = await reader.read();
      if (result.done) {
        convertToParagraphs(combinedOutput, paragraphId);
        setIsStreamingComplete(true);
        break;
      }
      const chunk = decoder.decode(result.value, { stream: true });
      combinedOutput += chunk;
      iterationCount++;
      if (iterationCount % 5 === 0) {
        convertToParagraphs(combinedOutput, paragraphId);
      }
    }
  }

  function convertToParagraphs(text: string, paragraphId?: number) {
    if (paragraphId !== undefined) {
      setStreamingTextArray((prev) =>
        prev.map((p) => (p.id === paragraphId ? { ...p, text } : p))
      );
    } else {
      const paragraphs = text
        .split(/(?:\r\n|\r|\n){2,}/)
        .map((txt, idx) => ({ id: idx, text: txt }));
      setStreamingTextArray(paragraphs);
    }
  }

  async function handleOnSave(paragraphs: string[]) {
    // Example: store doc in DB
    const result = await processNewECQDocument(paragraphs.join("\n\n"), "ECQ Title");
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
      {/* Provide Additional Info (docInfo, jobInfo, otherInfo) */}
      <AdditionalInfoBox showIsDummy={docInfo.isDummy} />

      {/* The streaming output viewer */}
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

      {/* The user picks which positions/accomplishments to include */}
      <GeneratePositions
        employmentHistory={employmentHistory}
        otherPositions={otherPositions}
        selectedState={selectedState}
        onSelectionChange={handleSelectionChange}
      />

      {/* Bottom bar with “Generate” button */}
      <GenerateBottomBar
        onGenerateClick={handleGenerateClick}
        isGenerateDisabled={!isGenerateEnabled}
        generatedDocuments={generatedDocuments}
        onViewDocument={(docId) => window.open(`/document/${docId}`, "_blank")}
      />
    </div>
  );
}
