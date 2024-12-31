// File path: apps/web/app/(routes)/generate/resume/[id]/_Components/GenerateBottomBar.tsx
import React from 'react';
import GenerateButton from '@/app/(routes)/generate/resume/[id]/_Components/_Subcomponents/GenerateButton'; // Assuming GenerateButton is in the same directory
import { GeneratedDocumentCard } from './GeneratedDocumentCard';
import { GeneratedDocumentInformation } from '@/app/_types/GeneratedDocumentInformation';

interface GenerateBottomBarProps {
    onGenerateClick: (paragraphId?: number) => Promise<void>;
    isGenerateDisabled: boolean;
    generatedDocuments: GeneratedDocumentInformation[];
    onViewDocument: (documentId: number) => void;
  }
const GenerateBottomBar: React.FC<GenerateBottomBarProps> = ({ onGenerateClick, isGenerateDisabled, generatedDocuments, onViewDocument }) => {
  return (
    <div className="floating-bar">
      <GenerateButton onClick={() => onGenerateClick()} isDisabled={isGenerateDisabled} />

      <div className="generated-documents">
        {generatedDocuments.map(doc => (
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
