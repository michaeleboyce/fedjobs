// File path: packages/utils/src/Constants/DocumentConstants.ts
import { DocumentType, GenerationType } from '@fedjobs/types';

export const DOCUMENT_TYPES: [DocumentType, ...DocumentType[]] = ["resume", "ecq", "tcq", "cover_letter", "other"];
export const GENERATION_TYPES: [GenerationType, ...GenerationType[]] = ["resume", "ecq", "tcq", "cover_letter", "paragraph", "other"];

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

export const PINECONE_INDEX_NAME = 'fedjobs';

// Additional dummy data exports
export const DUMMY_ANNOTATED_TEXT = `<html>...`; // Your full dummy text here
export const DUMMY_FULL_RESUME_NAME = 'Resume-1706048129455.json';
export const DUMMY_FULL_RESUME_JSON = `{...}`; // Your full JSON here
export const DUMMY_FULL_ECQ_TEXT = `In my tenure...`; // Your full ECQ text here
export const DUMMY_ECQ_PARAGRAPH_TEXT = `My approach was...`; // Your paragraph text here
export const DUMMY_FULL_ECQ_FILENAME = 'GeneratedDocument-2075763b7a463bea5d1f29a8ba19afae-1706739995136.docx';
export const DUMMY_FULL_ECQ_URL = 'https://fedjobs.s3.us-east-2.amazonaws.com/GeneratedDocument-2075763b7a463bea5d1f29a8ba19afae-1706739995136.docx';
export const DUMMY_FULL_ECQ_DOC_ID = 12;