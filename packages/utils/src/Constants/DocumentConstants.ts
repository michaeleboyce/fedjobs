// File path: packages/utils/src/Constants/DocumentConstants.ts
// Re-export from types package for backward compatibility
import { DOCUMENT_TYPES, GENERATION_TYPES, getPrettyPrintType } from '@fedjobs/types';

export { DOCUMENT_TYPES, GENERATION_TYPES, getPrettyPrintType };

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