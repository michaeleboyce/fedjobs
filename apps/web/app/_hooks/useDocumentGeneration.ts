import { useState, useCallback } from 'react';
import { Position } from "@fedjobs/types";
import { StreamingTextArray } from "@/app/_types/StreamingTextArray";
import { GenerationSelection, SelectedPositionData } from "@/app/_types/GenerationSelection";
import { createMockReader } from "@/app/_utils/mockReader";
import { GeneratedDocumentInformation } from "@/app/_types/GeneratedDocumentInformation";
import { processNewECQDocument } from "@/app/_actions/files/fileActions";

const API_BASE_URL = process.env.NODE_ENV === 'development'
  ? 'http://localhost:3000'
  : 'https://fedjobs.vercel.app';

interface UseDocumentGenerationProps {
  employmentHistory: Position[];
  otherPositions: Position[];
  docInfo: any;
  jobInfo: any;
  otherInfo: string;
  dummyText: string;
  paragraphDummyText: string;
}

export function useDocumentGeneration({
  employmentHistory,
  otherPositions,
  docInfo,
  jobInfo,
  otherInfo,
  dummyText,
  paragraphDummyText
}: UseDocumentGenerationProps) {
  // State
  const [selectedState, setSelectedState] = useState<Record<string,{ selectedActivities: number[]; selectedAccomplishments: number[] }>>({});
  const [isGenerateEnabled, setIsGenerateEnabled] = useState(false);
  const [streamingTextArray, setStreamingTextArray] = useState<StreamingTextArray>([]);
  const [isStreamingComplete, setIsStreamingComplete] = useState(false);
  const [selectedParagraphId, setSelectedParagraphId] = useState<number | null>(null);
  const [saveResult, setSaveResult] = useState({ url: "", message: "" });
  const [generatedDocuments, setGeneratedDocuments] = useState<GeneratedDocumentInformation[]>([]);
  const [model, setModel] = useState("claude-3-7-sonnet-20250219");

  // Handle selections
  const handleSelectionChange = useCallback((newSelected: typeof selectedState) => {
    setSelectedState(newSelected);

    // If any position has at least one selection, enable "Generate"
    const hasSelections = Object.values(newSelected).some(
      (pos) => pos.selectedActivities.length > 0 || pos.selectedAccomplishments.length > 0
    );
    setIsGenerateEnabled(hasSelections);
  }, []);

  // Handle document generation
  const handleGenerateClick = async (paragraphId?: number, regenerationText?: string) => {
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

    // Use dummy data or real API
    let reader: ReadableStreamDefaultReader<Uint8Array>;
    let combinedOutput = "";
    let iterationCount = 0;

    if (docInfo.isDummy) {
      // Use mock reader for testing
      reader = createMockReader(
        paragraphId !== undefined ? paragraphDummyText : dummyText, 
        [5, 15]
      ) as ReadableStreamDefaultReader<Uint8Array>;
    } else {
      // Make API request
      const res = await fetch(`${API_BASE_URL}/api/ai/generate/${docInfo.type}${
        paragraphId !== undefined ? `/paragraph` : ``
      }`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          generationSelection,
          streamingTextArray,
          paragraphId,
          regenerationText: regenerationText ?? '',
          model,
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
  };

  // Split text into paragraphs
  const convertToParagraphs = (text: string, paragraphId?: number) => {
    if (paragraphId !== undefined) {
      setStreamingTextArray((prev) =>
        prev.map((p) => (p.id === paragraphId ? { ...p, text } : p))
      );
    } else {
      const paragraphs = text
        .split(/\n\s*\n+/)
        .map((txt, idx) => ({ id: idx, text: txt.trim() }));
      setStreamingTextArray(paragraphs);
    }
  };

  // Save document to database
  const handleSaveDocument = async () => {
    const paragraphTexts = streamingTextArray.map(p => p.text);
    const joinedText = paragraphTexts.join("\n\n");
    
    const result = await processNewECQDocument(joinedText, docInfo.ecqShortTitle || "");
    if (result.status === "ok") {
      setSaveResult({
        url: result.body.url,
        message: "Document Successfully Saved - Click here to view",
      });
      
      // Add to generated documents list
      setGeneratedDocuments(prev => [
        ...prev,
        {
          title: `${docInfo.type.toUpperCase()} - ${new Date().toLocaleString()}`,
          type: docInfo.type,
          ecqName: docInfo.ecqShortTitle,
          dateCreated: new Date().toISOString(),
          documentId: result.body.documentId
        }
      ]);
    } else {
      setSaveResult({ url: "", message: "Save error occurred" });
    }
  };

  // Paragraph operations
  const handleParagraphSelection = (paragraphId: number) => {
    setSelectedParagraphId(paragraphId);
  };

  const handleParagraphTextUpdate = (paragraphId: number, newText: string) => {
    setStreamingTextArray(prev => 
      prev.map(p => p.id === paragraphId ? { ...p, text: newText } : p)
    );
  };

  const handleParagraphDelete = (paragraphId: number) => {
    setStreamingTextArray(prev => prev.filter(p => p.id !== paragraphId));
    if (selectedParagraphId === paragraphId) {
      setSelectedParagraphId(null);
    }
  };

  const handleParagraphMove = (paragraphId: number, direction: 'up' | 'down') => {
    setStreamingTextArray(prev => {
      const index = prev.findIndex(p => p.id === paragraphId);
      if (index === -1) return prev;
      
      const newIndex = direction === 'up' ? Math.max(0, index - 1) : Math.min(prev.length - 1, index + 1);
      if (newIndex === index) return prev;
      
      const result = [...prev];
      const [movedItem] = result.splice(index, 1);
      result.splice(newIndex, 0, movedItem);
      return result;
    });
  };

  // Handle paragraph reordering
  const handleParagraphReorder = (data: string[] | StreamingTextArray) => {
    if (Array.isArray(data)) {
      if (data.length > 0 && typeof data[0] === 'object') {
        // Handle StreamingTextArray (paragraph reordering)
        setStreamingTextArray(data as StreamingTextArray);
      }
    }
  };

  return {
    // State
    selectedState,
    isGenerateEnabled,
    streamingTextArray,
    isStreamingComplete,
    selectedParagraphId,
    saveResult,
    generatedDocuments,
    model,
    setModel,
    
    // Handlers
    handleSelectionChange,
    handleGenerateClick,
    handleSaveDocument,
    handleParagraphSelection,
    handleParagraphTextUpdate,
    handleParagraphDelete,
    handleParagraphMove,
    handleParagraphReorder,
  };
}