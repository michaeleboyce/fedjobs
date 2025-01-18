// global.d.ts (or a similarly named file within your src folder)
declare module "pdfjs-dist/legacy/build/pdf" {
    import type {
      PDFDocumentProxy,
      PDFDocumentLoadingTask,
      DocumentInitParameters,
    } from "pdfjs-dist/types/src/pdf";
  
    interface PDFJSLegacy {
      /**
       * The main entrypoint for loading a PDF in pdf.js
       */
      getDocument(
        src: string | Uint8Array | DocumentInitParameters
      ): PDFDocumentLoadingTask<PDFDocumentProxy>;
  
      version: string;
      build: string;
      // Add other methods/fields as needed
    }
  
    const pdfjs: PDFJSLegacy;
    export = pdfjs;
  }
  