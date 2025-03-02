import { useState, useCallback } from 'react';
import { JobInfo, Position } from "@fedjobs/types";
import { DocumentInfo, StreamingTextArray } from "../types";
import { ResumeObject } from '@/app/shared/types/Resume';
import { useGenerationSettings } from './useGenerationSettings';
import { useDocumentEditor } from './useDocumentEditor';
import { usePositionSelection } from './usePositionSelection';
import { GenerationSelection } from '../types/GenerationSelection';
import { createAPI } from '../utils';

interface DocumentGenerationProps {
  employmentHistory: Position[];
  otherPositions: Position[];
  resume?: ResumeObject;
  docInfo: DocumentInfo;
  jobInfo: JobInfo;
  otherInfo: string;
}

export function useDocumentGeneration({
  employmentHistory,
  otherPositions,
  resume,
  docInfo,
  jobInfo,
  otherInfo
}: DocumentGenerationProps) {
  // Get settings, editor and position selection state
  const settings = useGenerationSettings();
  const editor = useDocumentEditor();
  const selection = usePositionSelection(employmentHistory, otherPositions, resume);

  // Model selection
  const [model, setModel] = useState("claude-3-7-sonnet-20250219");

  // Handle document generation
  const handleGenerateClick = async (paragraphId?: number, regenerationText?: string) => {
    // Build selection data for generation
    const generationSelection = buildGenerationSelection(
      selection.selectedState,
      employmentHistory,
      otherPositions,
      settings.docInfo || docInfo,
      settings.jobInfo || jobInfo,
      settings.otherInfo || otherInfo
    );

    if (generationSelection.positions.length === 0) {
      console.warn("No positions selected!");
      return;
    }

    // Only reset editor for full document generation, not for paragraph regeneration
    if (paragraphId === undefined) {
      editor.resetEditor();
    }

    // Generate content through API
    const api = createAPI(
      docInfo.isDummy,
      docInfo.type,
      paragraphId,
      generationSelection,
      editor.streamingTextArray,
      model
    );

    try {
      await api.generateContent(
        paragraphId,
        regenerationText,
        (content, paragraphId) => editor.updateContent(content, paragraphId)
      );

      editor.completeEditing();
    } catch (error) {
      console.error("Error in generation:", error);
    }
  };

  // Inside useDocumentGeneration hook
  const handleInsertParagraph = async (index: number, text: string, useAI: boolean) => {
    // Get current paragraphs
    const currentParagraphs = editor.streamingTextArray;

    // Create a new ID for the paragraph (find max ID and increment)
    const maxId = currentParagraphs.length > 0
      ? Math.max(...currentParagraphs.map(p => p.id))
      : 0;
    const newId = maxId + 1;

    if (useAI) {
      // For AI generation, insert a placeholder and then update the array
      const placeholderText = "Generating...";
      const newParagraph = { id: newId, text: placeholderText };
      const newArray = [
        ...currentParagraphs.slice(0, index),
        newParagraph,
        ...currentParagraphs.slice(index)
      ];

      // First update the array with the placeholder
      editor.setStreamingTextArray(newArray);

      // Then trigger AI regeneration with the text as instructions
      try {
        await handleGenerateClick(newId, text);
      } catch (error) {
        console.error("Error generating paragraph:", error);
        // Fallback to just inserting the text
        const updatedArray = editor.streamingTextArray.map(p =>
          p.id === newId ? { ...p, text } : p
        );
        editor.setStreamingTextArray(updatedArray);
      }
    } else {
      // For manual entry, just insert the new paragraph
      const newParagraph = { id: newId, text };
      const newArray = [
        ...currentParagraphs.slice(0, index),
        newParagraph,
        ...currentParagraphs.slice(index)
      ];

      editor.setStreamingTextArray(newArray);
    }
  };

  // Handle document saving
  const handleSaveDocument = async () => {
    // Implement document saving logic
    try {
      // Call your save document API here
      const saveResult = {
        url: `/document/${Date.now()}`,
        message: "Document saved successfully!"
      };
      editor.setSaveResult(saveResult);
    } catch (error) {
      console.error("Error saving document:", error);
      editor.setSaveResult({
        url: "",
        message: "Error saving document. Please try again."
      });
    }
  };

  // Combine everything for the public API
  return {
    // Document settings
    ...settings,

    // Editor state and handlers
    ...editor,

    // Position selection state and handlers
    ...selection,

    // Model selection
    model,
    setModel,

    // Primary actions
    handleGenerateClick,
    handleSaveDocument,
    handleInsertParagraph,
  };
}

// Helper to build the generation selection object
function buildGenerationSelection(
  selectedState: Record<string, { selectedActivities: number[]; selectedAccomplishments: number[] }>,
  employmentHistory: Position[],
  otherPositions: Position[],
  docInfo: DocumentInfo,
  jobInfo: JobInfo,
  otherInfo: string
): GenerationSelection {
  const selectedPositions = Object.entries(selectedState).flatMap(
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

  return {
    positions: selectedPositions,
    docInfo,
    jobInfo,
    otherInfo,
    length: docInfo.length,
    lengthUnit: docInfo.lengthUnit,
  };
}