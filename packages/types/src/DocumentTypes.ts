// In packages/types/src/DocumentTypes.ts
// Use a tuple type assertion rather than string[]
export const DOCUMENT_TYPES = ["cover_letter", "ecq", "resume", "tcq", "other"] as [string, ...string[]];
export const GENERATION_TYPES = ["cover_letter", "ecq", "paragraph", "resume", "tcq", "other"] as [string, ...string[]];

// Keep your type definitions as is
export type DocumentType = "cover_letter" | "ecq" | "resume" | "tcq" | "other";
export type GenerationType = DocumentType | "paragraph";
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