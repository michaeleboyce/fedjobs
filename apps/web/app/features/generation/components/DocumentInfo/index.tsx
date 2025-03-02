// File path: apps/web/app/features/generation/components/DocumentInfo/index.tsx
import { useGenerationContext } from "../../providers/GenerationProvider";
import { DocumentTypeSelector } from "./DocumentTypeSelector";
import { ECQSelector } from "./ECQSelector";
import { JobInfoInput } from "./JobInfoInput";
import { LengthSelector } from "./LengthSelector";

interface DocumentInfoProps {
  showIsDummy: boolean;
}

export function DocumentInfo({ showIsDummy }: DocumentInfoProps) {
  const { otherInfo, setOtherInfo, docInfo, setDocInfo } =
    useGenerationContext();
  //Writing this function, otherwise I'll have to replace updateDocInfo, with setDocInfo({...docInfo, ...whatever the value is}),
  //  this avoids the extra ...docInfo

  const updateDocInfo = (updates: Partial<typeof DocumentInfo>) => {
    setDocInfo({ ...docInfo, ...updates });
  };
  return (
    <div className="upload-section bg-white p-4 border border-gray-200 rounded-lg mb-4">
      <div className="upload-card flex flex-col items-start">
        <h3 className="text-lg font-semibold mb-4">
          Information for Generation
        </h3>

        {/* Job Information */}
        <JobInfoInput />

        {/* Document Type Information */}
        <div className="w-full text-left">
          <h4 className="text-md font-semibold mb-4">Document Information</h4>

          {/* Dummy data toggle (if shown) */}
          {showIsDummy && (
            <label className="flex items-center mb-4">
              <input
                type="checkbox"
                checked={docInfo.isDummy}
                onChange={(e) => updateDocInfo({ isDummy: e.target.checked })}
                className="mr-2"
              />
              <span>Use Dummy Data</span>
            </label>
          )}

          {/* Document Type Selector */}
          <DocumentTypeSelector
            selectedType={docInfo.type}
            onChange={(type) => updateDocInfo({ type })}
          />

          {/* ECQ Selector (if type is ECQ) */}
          {docInfo.type.toLowerCase() === "ecq" && (
            <ECQSelector
              selectedEcq={docInfo.ecqShortTitle}
              onChange={(ecqShortTitle) => updateDocInfo({ ecqShortTitle })}
            />
          )}

          {/* Additional document info */}
          <textarea
            value={docInfo.additionalDocInfo}
            onChange={(e) =>
              updateDocInfo({ additionalDocInfo: e.target.value })
            }
            placeholder="Anything else we should know about the document"
            className="mb-4 w-full text-base p-2 border border-gray-300 rounded-md bg-white"
          />

          {/* Document Length Selector */}
          <LengthSelector
            length={docInfo.length}
            lengthUnit={docInfo.lengthUnit}
            onLengthChange={(length) => updateDocInfo({ length })}
            onLengthUnitChange={(lengthUnit) => {
              // Default length based on unit
              const newLength = lengthUnit === "words" ? 500 : 2;
              updateDocInfo({ lengthUnit, length: newLength });
            }}
          />
        </div>

        {/* Other Information */}
        <h4 className="text-md font-semibold mb-4">Other Information</h4>
        <textarea
          value={otherInfo}
          onChange={(e) => setOtherInfo(e.target.value)}
          placeholder="Please add other information about the document you need to provide, such as additional instructions, etc."
          className="mb-4 w-full text-base p-2 border border-gray-300 rounded-md bg-white"
        />
      </div>
    </div>
  );
}
