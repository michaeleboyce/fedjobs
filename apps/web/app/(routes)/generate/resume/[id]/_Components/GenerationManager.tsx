'use client'
import React, { useState, useCallback } from 'react';
import { Resume as ResumeComponent } from '@/app/_components/Resume';
import { AdditionalInfoBox } from './AdditionalInfoBox';
import { ResumeObject } from '@/app/_classes/Resume';
import { DUMMY_ECQ_PARAGRAPH_TEXT, DUMMY_FULL_ECQ_TEXT } from '@/app/_utils/Constants';
import { PositionObject } from '@/app/_classes/Position';
import { getDocumentSignedURL, processNewECQDocument } from '@/app/_actions/files/fileActions';
import { GeneratedDocumentInformation } from '@/app/_types/GeneratedDocumentInformation';
import GenerateBottomBar from './GenerateBottomBar';
import { GenerationSelection } from '@/app/_types/GenerationSelection';
import StreamingDocumentViewer from './StreamingDocumentViewer';
import { createMockReader } from '@/app/_utils/mockReader';
import { StreamingTextArray } from '@/app/_types/StreamingTextArray';
import { useGenerationContext } from '../../../_Providers/GenerationProvider';

type SelectedStateType = {
  positions: {
    position: PositionObject;
    selectedActivities: number[];
    selectedAccomplishments: number[];
  }[];
};

type GenerationManagerProps = {
  resume: ResumeObject;
  userEmail: string;
};

const appUrl = process.env.NODE_ENV === 'development'
  ? 'http://localhost:3000'
  : 'https://fedjobs.vercel.app';

const GenerationManager: React.FC<GenerationManagerProps> = ({ resume, userEmail }) => {
  const { jobInfo, docInfo, otherInfo } = useGenerationContext();

  const [selectedState, setSelectedState] = useState<SelectedStateType>({
    positions: []
  });
  const [isGenerateEnabled, setIsGenerateEnabled] = useState(false);
  const [selectedParagraph, setSelectedParagraph] = useState<number | null>(null);
  const [generatedDocuments, setGeneratedDocuments] = useState<GeneratedDocumentInformation[]>([]);
  const [streamingTextArray, setStreamingTextArray] = useState<StreamingTextArray>([]);
  const [isStreamingComplete, setIsStreamingComplete] = useState(false);
  const [documentName, setDocumentName] = useState(''); 
  const [saveResult, setSaveResult] = useState({ url: '', message: '' });

  /**
   * ---- Add these lines so you can pass them to GenerateBottomBar ----
   */
  // 1) Decide if we show the model selector
  const showModelSelector = userEmail === "wizrb47@gmail.com";

  // 2) Track which model is chosen, default to Claude
  const [model, setModel] = useState("claude-3-5-sonnet-20241022");

  const handleSelectionChange = useCallback((newSelectedState: {
    positions: {
      position: PositionObject;
      selectedActivities: number[];
      selectedAccomplishments: number[];
    }[];
  }) => {
    requestAnimationFrame(() => {
      setSelectedState(newSelectedState);
      setIsGenerateEnabled(newSelectedState.positions.length > 0);
    });
  }, []);

  const handleViewClick = async (documentId: number) => {
    const response = await getDocumentSignedURL(documentId);
    if (response.success) {
      window.open(response.success.url, '_blank');
    } else {
      alert('Error retrieving document: ' + response.failure);
    }
  };

  const handleGenerateClick = async (paragraphId?: number, regenerationText?: string) => {
    if (!selectedState.positions.length) {
      console.error("No positions selected");
      return;
    }

    const generationSelection: GenerationSelection = {
      positions: selectedState.positions.map((posData) => ({
        position: posData.position,
        selectedActivities: posData.selectedActivities.map(
          (idx) => posData.position.details.activities[idx]
        ),
        selectedAccomplishments: posData.selectedAccomplishments.map(
          (idx) => posData.position.details.accomplishments[idx]
        ),
      })),
      otherInfo,
      jobInfo,
      docInfo,
      length: docInfo.length,
      lengthUnit: docInfo.lengthUnit,
    };

    let reader;
    if (docInfo.isDummy) {
      reader = createMockReader(
        paragraphId !== undefined ? DUMMY_ECQ_PARAGRAPH_TEXT : DUMMY_FULL_ECQ_TEXT,
        [5, 15]
      );
    } else {
      const res = await fetch(
        `${appUrl}/api/ai/generate/${generationSelection.docInfo.type}${
          paragraphId !== undefined ? `/paragraph` : ``
        }`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            generationSelection,
            streamingTextArray,
            paragraphId,
            regenerationText: regenerationText ?? '',
            model, // pass your chosen model from state
          }),
        }
      );

      if (!res.ok) {
        console.error('Response was not OK.');
        return;
      }
      if (!res.body) {
        console.error('No response body.');
        return;
      }

      reader = res.body.getReader();
    }

    let result;
    const decoder = new TextDecoder('utf8');
    let combinedOutput = '';
    let iterationCount = 0;

    // Reset streaming
    setStreamingTextArray([]);
    setIsStreamingComplete(false);

    while (true) {
      result = await reader.read();
      if (result.done) {
        convertStreamingTextToParagraphs(combinedOutput, paragraphId);
        setIsStreamingComplete(true);
        break;
      }
      let chunk = decoder.decode(result.value, { stream: true });
      combinedOutput += chunk;
      iterationCount++;

      if (iterationCount % 5 === 0) {
        convertStreamingTextToParagraphs(combinedOutput, paragraphId);
      }
    }
  };

  const convertStreamingTextToParagraphs = (combinedOutput: string, paragraphId?: number) => {
    let paragraphs = streamingTextArray;
    if (paragraphId !== undefined) {
      paragraphs = paragraphs.map(paragraph => {
        if (paragraph.id === paragraphId) {
          return { ...paragraph, text: combinedOutput };
        }
        return paragraph;
      });
    } else {
      paragraphs = combinedOutput.split(/(?:\r\n|\r|\n){2,}/).map((text, index) => ({
        id: index, 
        text: text,
      }));
    }
    setStreamingTextArray(paragraphs);
  };

  const handleOnSave = async (paragraphs: string[]) => {
    const result = await processNewECQDocument(
      paragraphs.join('\n\n'),
      docInfo.ecqShortTitle || ''
    );
    if (result.status === 'ok') {
      setSaveResult({
        url: result.body.url,
        message: "Document Successfully Saved - Click here to view"
      });
    } else {
      setSaveResult({ url: '', message: "Save error occurred" });
    }
  };

  const handleParagraphTextUpdate = useCallback((paragraphId: number, newText: string) => {
    setStreamingTextArray(currentArray =>
      currentArray.map(paragraph =>
        paragraph.id === paragraphId
          ? { ...paragraph, text: newText }
          : paragraph
      )
    );
  }, []);

  const handleParagraphDelete = useCallback((id: number) => {
    setStreamingTextArray(prevArray => prevArray.filter(paragraph => paragraph.id !== id));
    setSelectedParagraph(null);
  }, []);

  const moveParagraph = useCallback(
    (index: number, direction: 'up' | 'down') => {
      setStreamingTextArray(prevArray => {
        const newArray = [...prevArray];
        if (
          (index === 0 && direction === 'up') ||
          (index === newArray.length - 1 && direction === 'down')
        ) {
          return newArray;
        }
        const swapIndex = direction === 'up' ? index - 1 : index + 1;
        [newArray[index], newArray[swapIndex]] = [newArray[swapIndex], newArray[index]];
        return newArray;
      });
      if (selectedParagraph === index) {
        setSelectedParagraph(direction === 'up' ? index - 1 : index + 1);
      } else if (direction === 'up' && selectedParagraph === index - 1) {
        setSelectedParagraph(index);
      } else if (direction === 'down' && selectedParagraph === index + 1) {
        setSelectedParagraph(index);
      }
    },
    [selectedParagraph]
  );

  return (
    <div className="main-container">
      <AdditionalInfoBox showIsDummy={showModelSelector} />

      <StreamingDocumentViewer
        documentName={documentName}
        streamingTextArray={streamingTextArray}
        isStreamingComplete={isStreamingComplete}
        onSave={handleOnSave}
        saveResult={saveResult}
        onRegenerateParagraph={handleGenerateClick}
        onParagraphDelete={handleParagraphDelete}
        onMoveParagraph={moveParagraph}
        selectedParagraph={selectedParagraph}
        onSelectParagraph={setSelectedParagraph}
        onParagraphTextUpdate={handleParagraphTextUpdate}
      />

      <ResumeComponent
        resume={resume}
        onSelectionChange={handleSelectionChange}
        isViewOnly={false}
      />

      <GenerateBottomBar
        onGenerateClick={handleGenerateClick}
        isGenerateDisabled={!isGenerateEnabled}
        generatedDocuments={generatedDocuments}
        onViewDocument={handleViewClick}

        // **Now we pass these props**:
        showModelSelector={showModelSelector}
        model={model}
        setModel={setModel}
      />
    </div>
  );
};

export default GenerationManager;
