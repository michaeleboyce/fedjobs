import { useState, useCallback } from 'react';
import { Position } from "@fedjobs/types";
import { StreamingTextArray } from "../types";
import { ResumeObject } from '@/app/shared/types/Resume';
import { useGenerationSettings } from './useGenerationSettings';
import { useDocumentEditor } from './useDocumentEditor';
import { usePositionSelection } from './usePositionSelection';
import { GenerationSelection } from '../types/GenerationSelection';
import { createAPI } from '../utils';

export function useDocumentGeneration({
  employmentHistory,
  otherPositions,
  resume,
  docInfo,
  jobInfo,
  otherInfo
}) {
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
      settings.docInfo,
      settings.jobInfo,
      settings.otherInfo
    );
    
    if (generationSelection.positions.length === 0) {
      console.warn("No positions selected!");
      return;
    }
    
    // Reset and prepare editor state
    editor.resetEditor();
    
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
        (content) => editor.updateContent(content, paragraphId)
      );
      
      editor.completeEditing();
    } catch (error) {
      console.error("Error in generation:", error);
    }
  };
  
  // Handle document saving
  const handleSaveDocument = async () => {
    // Implement document saving logic
    // ...
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
  };
}

// Helper to build the generation selection object
function buildGenerationSelection(
  selectedState,
  employmentHistory,
  otherPositions,
  docInfo,
  jobInfo,
  otherInfo
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