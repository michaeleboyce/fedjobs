// File path: apps/web/app/(routes)/generate/resume/[id]/_Components/_Subcomponents/_AdditionalInfoBox/DocumentInfo.tsx
import React from 'react';
import { DOCUMENT_TYPES, ECQ_NAMES, getPrettyPrintType } from '@/app/_utils/Constants';
import { useGenerationContext } from '../../../_Providers/GenerationProvider';
import { ECQNamesType } from '@/app/_types/ECQCompetencies';

type DocumentInfoProps = {

  showIsDummy: boolean;
 

}

export const DocumentInfo: React.FC<DocumentInfoProps> = ({
  showIsDummy,

}) => {
  const { docInfo, setDocInfo } = useGenerationContext();
  const handleEssayPromptChange = (event: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const value = event.target.value;
    // Check if the target is a select element
    if (event.target instanceof HTMLSelectElement) {
      if (docInfo.essayPromptSuggestions.includes(value)) {
        setDocInfo({...docInfo, essayPrompt: value});
      } else if (value === "custom") {
        setDocInfo({...docInfo, essayPrompt: ''});
      }
    } else { // It's an input element
      setDocInfo({...docInfo, essayPrompt: value});
    }
  };
  

  const handleDummyDataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDocInfo({...docInfo, isDummy: e.target.checked});
  }

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setDocInfo({...docInfo, type: e.target.value});
  }

  const handleECQTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setDocInfo({...docInfo, ecqShortTitle: e.target.value as ECQNamesType});
  }

  const handleAdditionalDocInfoChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDocInfo({...docInfo, additionalDocInfo: e.target.value});
  }
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
          {DOCUMENT_TYPES.map(type => {
            if (type !== 'resume'){
              return (
                <option key={type} value={type}>{getPrettyPrintType(type)}</option>
              )
            }
          })}
        </select>

        {docInfo.type.toLowerCase() === 'ecq' && (
          <select
            value={docInfo.ecqShortTitle}
            onChange={handleECQTypeChange}
            className="mb-4 w-full text-base p-2 border border-gray-300 rounded-md bg-white"
          >
            {Object.values(ECQ_NAMES).map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        )}
      {docInfo.type.toLowerCase() === 'tcq' && (
        <div>
        { docInfo.essayPromptSuggestions.length > 0 && ( 
          <select
            value={docInfo.essayPromptSuggestions.includes(docInfo.essayPrompt) ? docInfo.essayPrompt : "custom"}
            onChange={handleEssayPromptChange}
            className="mb-2 w-full text-base p-2 border border-gray-300 rounded-md bg-white"
          >
            {docInfo.essayPromptSuggestions.map((suggestion) => (
              <option key={suggestion} value={suggestion}>{suggestion}</option>
            ))}
            <option value="custom">Custom Prompt</option>
          </select>
            )}
          {docInfo.essayPrompt === '' || !docInfo.essayPromptSuggestions.includes(docInfo.essayPrompt) ? (
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

      </div>
    </div>
  );
};
