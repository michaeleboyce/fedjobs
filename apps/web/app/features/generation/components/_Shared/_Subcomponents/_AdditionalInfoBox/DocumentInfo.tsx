// File path: apps/web/app/(routes)/generate/_Components/_Subcomponents/_AdditionalInfoBox/DocumentInfo.tsx
import React, { useState, useEffect } from "react";
import {
  DOCUMENT_TYPES,
  ECQ_NAMES,
  getPrettyPrintType,
} from "@fedjobs/utils";
import { useGenerationManagement } from "@/app/features/generation/hooks/useGenerationManagement";
import { ECQNamesType } from "@/app/features/generation/types/ECQCompetencies";

type DocumentInfoProps = {
  showIsDummy: boolean;
};

export const DocumentInfo: React.FC<DocumentInfoProps> = ({ showIsDummy }) => {
  const { docInfo, updateDocInfo, setDocInfo } = useGenerationManagement();
  const [lengthInput, setLengthInput] = useState<string>(
    docInfo.length.toString()
  );

  const handleEssayPromptChange = (
    event: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>
  ) => {
    const value = event.target.value;
    // Check if the target is a select element
    if (event.target instanceof HTMLSelectElement) {
      if (docInfo.essayPromptSuggestions.includes(value)) {
        updateDocInfo({ essayPrompt: value });
      } else if (value === "custom") {
        updateDocInfo({ essayPrompt: "" });
      }
    } else {
      // It's an input element
      updateDocInfo({ essayPrompt: value });
    }
  };

  const handleDummyDataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateDocInfo({ isDummy: e.target.checked });
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateDocInfo({ type: e.target.value });
  };

  const handleECQTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateDocInfo({ ecqShortTitle: e.target.value as ECQNamesType });
  };

  useEffect(() => {
    setLengthInput(docInfo.length.toString());
  }, [docInfo.length, docInfo.lengthUnit]);

  const handleLengthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLengthInput(e.target.value);
  };

  const handleLengthBlur = () => {
    const value = parseInt(lengthInput, 10);
    if (
      !isNaN(value) &&
      value > 0 &&
      value <= getMaxLength(docInfo.lengthUnit)
    ) {
      updateDocInfo({ length: value });
    } else if (lengthInput === "") {
      // Optionally, do nothing or set to a temporary state
      // Here, we'll keep it empty until the user types a valid number
    } else {
      // If invalid, reset to default based on unit
      const defaultLength = docInfo.lengthUnit === "words" ? 500 : 2;
      updateDocInfo({ length: defaultLength });
      setLengthInput(defaultLength.toString());
      alert(`Please enter a valid number of ${docInfo.lengthUnit}.`);
    }
  };

  const handleLengthUnitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newUnit = e.target.value as "words" | "pages";
    const defaultLength = newUnit === "words" ? 500 : 2;
    updateDocInfo({ lengthUnit: newUnit, length: defaultLength });
    setLengthInput(defaultLength.toString());
  };

  // Helper function to get maximum allowed length based on unit
  const getMaxLength = (unit: "words" | "pages"): number => {
    return unit === "words" ? 5000 : 100; // Example limits
  };

  const handleAdditionalDocInfoChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    updateDocInfo({ additionalDocInfo: e.target.value });
  };
  return (
    <div className="w-full text-left">
      <h4 className="text-md font-semibold mb-4">Document Information</h4>

      <div>
        {showIsDummy && (
          <label>
            <input
              type="checkbox"
              checked={docInfo.isDummy}
              onChange={handleDummyDataChange}
              className="mr-2 mb-4"
            />
            Use Dummy Data
          </label>
        )}
        <select
          value={docInfo.type}
          onChange={handleTypeChange}
          className="mb-4 w-full text-base p-2 border border-gray-300 rounded-md bg-white"
        >
          {DOCUMENT_TYPES.map((type) => {
              return (
                <option key={type} value={type}>
                  {getPrettyPrintType(type)}
                </option>
              );
          })}
        </select>

        {docInfo.type.toLowerCase() === "ecq" && (
          <select
            value={docInfo.ecqShortTitle}
            onChange={handleECQTypeChange}
            className="mb-4 w-full text-base p-2 border border-gray-300 rounded-md bg-white"
          >
            {Object.values(ECQ_NAMES).map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        )}
        {docInfo.type.toLowerCase() === "tcq" && (
          <div>
            {docInfo.essayPromptSuggestions.length > 0 && (
              <select
                value={
                  docInfo.essayPromptSuggestions.includes(docInfo.essayPrompt)
                    ? docInfo.essayPrompt
                    : "custom"
                }
                onChange={handleEssayPromptChange}
                className="mb-2 w-full text-base p-2 border border-gray-300 rounded-md bg-white"
              >
                {docInfo.essayPromptSuggestions.map((suggestion) => (
                  <option key={suggestion} value={suggestion}>
                    {suggestion}
                  </option>
                ))}
                <option value="custom">Custom Prompt</option>
              </select>
            )}
            {docInfo.essayPrompt === "" ||
            !docInfo.essayPromptSuggestions.includes(docInfo.essayPrompt) ? (
              <input
                type="text"
                value={docInfo.essayPrompt}
                onChange={handleEssayPromptChange}
                placeholder="Type your custom TCQ essay prompt"
                className="mb-4 w-full text-base p-2 border border-gray-300 rounded-md bg-white"
              />
            ) : null}
          </div>
        )}
        <textarea
          value={docInfo.additionalDocInfo}
          onChange={handleAdditionalDocInfoChange}
          placeholder="Anything else we should know about the document "
          className="mb-4 w-full text-base p-2 border border-gray-300 rounded-md bg-white"
        />
        {/* Section for Document Length */}
        <h4 className="text-md font-semibold mb-4">Document Length</h4>
        <div className="flex items-center mb-4">
          <input
            type="number"
            value={lengthInput}
            onChange={handleLengthChange}
            onBlur={handleLengthBlur}
            placeholder="Length"
            min={1}
            max={getMaxLength(docInfo.lengthUnit)}
            className="mr-2 w-24 text-base p-2 border border-gray-300 rounded-md bg-white"
          />
          <select
            value={docInfo.lengthUnit}
            onChange={handleLengthUnitChange}
            className="w-32 text-base p-2 border border-gray-300 rounded-md bg-white"
          >
            <option value="words">Words</option>
            <option value="pages">Pages</option>
          </select>
        </div>
      </div>
    </div>
  );
};
