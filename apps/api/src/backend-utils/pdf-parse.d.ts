// File path: apps/api/src/backend-utils/pdf-parse.d.ts
declare module 'pdf-parse' {
  function pdf(data: { data: ArrayBuffer }): Promise<{ text: string }>;
  export = pdf;
}

declare module 'pdf-parse/lib/pdf-parse' {
  interface PDFParseResult {
    text: string;
  }

  interface PDFParseOptions {
    data: ArrayBuffer;
  }

  function pdf(options: PDFParseOptions): Promise<PDFParseResult>;

  export = pdf;
}