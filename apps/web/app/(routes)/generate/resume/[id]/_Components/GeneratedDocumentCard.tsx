import React from 'react';

type GeneratedDocumentCardProps = {
    title: string;
    type: string;
    ecqName?: string;
    dateCreated: string;
    documentId: number;
    onView: (documentId: number) => void;
  };
export const GeneratedDocumentCard: React.FC<GeneratedDocumentCardProps> = ({ title, type, ecqName, dateCreated, documentId, onView }) => {
    const handleViewClick = () => {
      onView(documentId);
    };
  
    return (
      <div className="generated-docs-card">
        <div>Title: {title}</div>
        <div>Type: {type}</div>
        {ecqName && <div>ECQ: {ecqName}</div>}
        <div>Date: {dateCreated}</div>
        <button onClick={handleViewClick}>View</button>
      </div>
    );
  };