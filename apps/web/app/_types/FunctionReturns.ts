// File path: apps/web/app/_types/FunctionReturns.ts
export type ProcessDocumentResponse = 
  { failure?: undefined; success: { text: string, type: 'doc'|'docx'|'pdf' } } |
  { failure: { message: string; isInvalidDocType: boolean }, success?: undefined };
