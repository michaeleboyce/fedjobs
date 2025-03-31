// File path: packages/types/src/DocumentTypes.ts
export type DocumentType = "cover_letter" | "ecq" | "resume" | "tcq" | "other";
export type GenerationType = DocumentType | "paragraph";

// Define constants to be used in both frontend and database schemas
export const DOCUMENT_TYPES: [DocumentType, ...DocumentType[]] = ["cover_letter", "ecq", "resume", "tcq", "other"];
export const GENERATION_TYPES: [GenerationType, ...GenerationType[]] = ["cover_letter", "ecq", "paragraph", "resume", "tcq", "other"];

// Helper functions to check types
export const isDocumentType = (type: string): type is DocumentType => {
    return DOCUMENT_TYPES.includes(type as DocumentType);
};

export const isGenerationType = (type: string): type is GenerationType => {
    return GENERATION_TYPES.includes(type as GenerationType);
};

// Pretty print function for document types
export const getPrettyPrintType = (type: string): string => {
  switch(type){
    case 'resume':
        return 'Resume';
    case 'ecq':
        return 'ECQ';
    case 'tcq':
        return 'TCQ';
    case 'cover_letter':
        return 'Cover Letter';
    case 'other':
        return 'Other';
    default:
        return 'Other';
  }
};