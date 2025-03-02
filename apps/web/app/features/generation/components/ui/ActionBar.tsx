// File path: apps/web/app/features/generation/components/ui/ActionBar.tsx
import { FaSave } from 'react-icons/fa';
import { GenerateButton } from './GenerateButton';
import { SaveButton } from './SaveButton';
import { GeneratedDocumentInformation } from '../../types';
import { availableModels } from '../../utils/modelSelectors';

interface ActionBarProps {
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

export function ActionBar({
  onGenerateClick,
  isGenerateDisabled,
  generatedDocuments,
  onViewDocument,
  onSaveDocument,
  isSaveEnabled = false,
  showModelSelector,
  model,
  setModel,
}: ActionBarProps) {
  return (
    <div className="floating-bar flex items-center justify-start space-x-4">
      {/* Model selector */}
      {showModelSelector && (
        <div className="flex items-center space-x-2 bg-white border border-gray-300 rounded px-3 py-2 shadow-sm">
          <label className="font-semibold text-gray-700">Model:</label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {availableModels.map(model => (
              <option key={model.id} value={model.id}>
                {model.provider}: {model.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Generate button */}
      <GenerateButton onClick={() => onGenerateClick()} isDisabled={isGenerateDisabled} />

      {/* Save document button */}
      {onSaveDocument && (
        <SaveButton
          onClick={onSaveDocument}
          isDisabled={!isSaveEnabled}
        />
      )}

      {/* Generated documents */}
      <div className="generated-documents flex flex-wrap gap-4">
        {generatedDocuments.map((doc) => (
          <div 
            key={doc.documentId}
            className="border p-4 rounded bg-white shadow-sm cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => onViewDocument(doc.documentId)}
          >
            <div className="font-medium">{doc.title}</div>
            <div className="text-sm text-gray-600">{doc.type}</div>
            {doc.ecqName && <div className="text-sm">ECQ: {doc.ecqName}</div>}
            <div className="text-xs text-gray-500 mt-1">
              {new Date(doc.dateCreated).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}