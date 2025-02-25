// File path: apps/web/app/(routes)/generate/_Shared/GenerateBottomBar.tsx

import React from "react";
import { FaSave } from "react-icons/fa";
import GenerateButton from "@/app/(routes)/generate/_Shared/_Subcomponents/GenerateButton";
import { GeneratedDocumentCard } from "../_Components/GeneratedDocumentCard";
import { GeneratedDocumentInformation } from "@/app/_types/GeneratedDocumentInformation";

interface GenerateBottomBarProps {
  onGenerateClick: (paragraphId?: number) => Promise<void>;
  isGenerateDisabled: boolean;
  generatedDocuments: GeneratedDocumentInformation[];
  onViewDocument: (documentId: number) => void;
  onSaveDocument?: () => Promise<void>;
  isSaveEnabled?: boolean;
  showModelSelector: boolean;
  model: string;
  setModel: React.Dispatch<React.SetStateAction<string>>;
}

/**
 * Bottom bar component with generation and save controls
 */
const GenerateBottomBar: React.FC<GenerateBottomBarProps> = ({
  onGenerateClick,
  isGenerateDisabled,
  generatedDocuments,
  onViewDocument,
  onSaveDocument,
  isSaveEnabled = false,
  showModelSelector,
  model,
  setModel,
}) => {
  return (
    <div className="floating-bar flex items-center justify-start space-x-4">
      {/* If showModelSelector is true, display a styled container for the label & dropdown */}
      {showModelSelector && (
        <div className="flex items-center space-x-2 bg-white border border-gray-300 rounded px-3 py-2 shadow-sm">
          <label className="font-semibold text-gray-700">Model:</label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="o1-mini">ChatGPT: o1-mini</option>
            <option value="gpt-4o">ChatGPT: gpt-4o</option>
            <option value="claude-3-7-sonnet-20250219">Claude: Sonnet</option>
          </select>
        </div>
      )}

      {/* Generate button */}
      <GenerateButton onClick={() => onGenerateClick()} isDisabled={isGenerateDisabled} />

      {/* Save document button */}
      {onSaveDocument && (
        <button
          onClick={onSaveDocument}
          disabled={!isSaveEnabled}
          className={`px-4 py-2 rounded font-semibold flex items-center ${
            isSaveEnabled
              ? "bg-green-600 text-white hover:bg-green-700"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }`}
        >
          <FaSave className="mr-2" /> Save Document
        </button>
      )}

      {/* Display generated documents (if any) */}
      <div className="generated-documents flex flex-wrap gap-4">
        {generatedDocuments.map((doc) => (
          <GeneratedDocumentCard
            key={doc.documentId}
            title={doc.title}
            type={doc.type}
            ecqName={doc.ecqName}
            dateCreated={doc.dateCreated}
            documentId={doc.documentId}
            onView={onViewDocument}
          />
        ))}
      </div>
    </div>
  );
};

export default GenerateBottomBar;
