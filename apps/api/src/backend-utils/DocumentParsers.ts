import mammoth from 'mammoth';
import pdfjsLib from 'pdfjs-dist';

export interface ProcessDocumentTextResponse {
  success?: {
    text: string;
    type: 'pdf' | 'docx' | 'doc';
  };
  failure?: {
    message: string;
    isInvalidDocType: boolean;
  };
}

export interface TextItem {
  str: string;
  transform: number[];  // Contains positioning information
  width: number;
  height: number;
  dir: string;
}

export interface TextContent {
  items: TextItem[];
  styles?: Record<string, any>;
}

/**
 * Configuration options for text extraction
 */
export interface TextExtractionOptions {
  preserveFormatting?: boolean;
  maintainTextPosition?: boolean;
  streamPages?: boolean;
  maxBufferSize?: number;  // in MB
}

/**
 * Cleans up the extracted text by trimming and formatting whitespace.
 * @param text The raw text extracted from the document.
 * @param preserveFormatting Whether to preserve some formatting elements.
 * @returns Cleaned-up text.
 */
export function cleanUpText(text: string, preserveFormatting = false): string {
  let cleanedText = text.trim();
  
  if (preserveFormatting) {
    // Preserve intentional line breaks but clean up extra whitespace
    cleanedText = cleanedText.replace(/(\r\n|\r|\n){3,}/g, '\n\n');
    cleanedText = cleanedText.replace(/[ \t]+/g, ' ');
  } else {
    // More aggressive cleanup
    cleanedText = cleanedText.replace(/(\r\n|\r|\n)/g, '\n\n');
    cleanedText = cleanedText.replace(/\s+/g, ' ');
  }
  
  return cleanedText;
}

/**
 * Sorts text items based on their position on the page
 * @param items Array of text items with position information
 * @returns Sorted array of text items
 */
function sortTextItemsByPosition(items: TextItem[]): TextItem[] {
  return [...items].sort((a, b) => {
    // First sort by y position (top to bottom)
    const yDiff = b.transform[5] - a.transform[5];
    if (Math.abs(yDiff) > 5) { // Small threshold for same-line text
      return yDiff;
    }
    // Then by x position (left to right) for items on the same line
    return a.transform[4] - b.transform[4];
  });
}

/**
 * Extracts raw text from a Word document buffer with enhanced options.
 * @param buffer The buffer containing the Word document.
 * @param options Text extraction options.
 * @returns Extracted text.
 */
export async function extractTextFromWordBuffer(
  buffer: Buffer,
  options: TextExtractionOptions = {}
): Promise<string> {
  try {
    const mammothOptions = {
      buffer,
      convertCharacters: true,
      preserveCharacterStyle: options.preserveFormatting,
      styleMap: options.preserveFormatting ? [
        "p[style-name='Heading 1'] => h1:fresh",
        "p[style-name='Heading 2'] => h2:fresh",
        "p[style-name='Heading 3'] => h3:fresh"
      ] : undefined
    };

    const result = await mammoth.extractRawText(mammothOptions);
    return cleanUpText(result.value, options.preserveFormatting);
  } catch (error) {
    console.error("Error parsing Word document:", error);
    throw error;
  }
}

/**
 * Generator function for streaming PDF text extraction
 * @param pdfDocument The PDF document to process
 * @param options Text extraction options
 */
async function* extractPDFTextStream(
  pdfDocument: pdfjsLib.PDFDocumentProxy,
  options: TextExtractionOptions
): AsyncGenerator<string> {
  for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
    const page = await pdfDocument.getPage(pageNum);
    const textContent = await page.getTextContent() as TextContent;
    
    let pageText: string;
    if (options.maintainTextPosition) {
      const sortedItems = sortTextItemsByPosition(textContent.items);
      pageText = sortedItems.map(item => item.str).join(' ');
    } else {
      pageText = textContent.items.map(item => item.str).join(' ');
    }
    
    yield cleanUpText(pageText, options.preserveFormatting);
  }
}

/**
 * Extracts text from a PDF buffer using pdf.js with enhanced positioning and streaming support.
 * @param buffer The buffer containing the PDF document.
 * @param options Text extraction options.
 * @returns Extracted text.
 */
export async function extractTextFromPDFBuffer(
  buffer: Buffer,
  options: TextExtractionOptions = {}
): Promise<string> {
  try {
    // Check buffer size if maxBufferSize is specified
    if (options.maxBufferSize && buffer.length > options.maxBufferSize * 1024 * 1024) {
      throw new Error(`PDF file size exceeds maximum allowed size of ${options.maxBufferSize}MB`);
    }

    const loadingTask = pdfjsLib.getDocument({ data: buffer });
    const pdfDocument = await loadingTask.promise;

    if (options.streamPages) {
      // Use streaming approach for large documents
      let fullText = '';
      for await (const pageText of extractPDFTextStream(pdfDocument, options)) {
        fullText += pageText + '\n\n';
      }
      return cleanUpText(fullText, options.preserveFormatting);
    } else {
      // Regular approach for smaller documents
      let fullText = '';
      for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
        const page = await pdfDocument.getPage(pageNum);
        const textContent = await page.getTextContent() as TextContent;
        
        let pageText: string;
        if (options.maintainTextPosition) {
          const sortedItems = sortTextItemsByPosition(textContent.items);
          pageText = sortedItems.map(item => item.str).join(' ');
        } else {
          pageText = textContent.items.map(item => item.str).join(' ');
        }
        
        fullText += pageText + '\n\n';
      }
      return cleanUpText(fullText, options.preserveFormatting);
    }
  } catch (error) {
    console.error("Error parsing PDF document with pdf.js:", error);
    throw error;
  }
}

/**
 * Processes a document from a buffer and its MIME type with enhanced options.
 * @param buffer The buffer containing the document.
 * @param mimeType The MIME type of the document.
 * @param options Text extraction options.
 * @returns Processed document response.
 */
export async function processDocumentTextFromBuffer(
  buffer: Buffer,
  mimeType: string,
  options: TextExtractionOptions = {}
): Promise<ProcessDocumentTextResponse> {
  try {
    let text: string;
    let type: 'pdf' | 'docx' | 'doc';

    switch (mimeType) {
      case 'application/pdf':
        text = await extractTextFromPDFBuffer(buffer, options);
        type = 'pdf';
        break;
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        text = await extractTextFromWordBuffer(buffer, options);
        type = 'docx';
        break;
      case 'application/msword':
        text = await extractTextFromWordBuffer(buffer, options);
        type = 'doc';
        break;
      default:
        throw new Error('Unsupported file type');
    }

    return { success: { text, type } };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      failure: {
        message: errorMessage,
        isInvalidDocType: errorMessage.includes('Unsupported file type')
      }
    };
  }
}

// Example usage:
/*
const options: TextExtractionOptions = {
  preserveFormatting: true,
  maintainTextPosition: true,
  streamPages: true,
  maxBufferSize: 50  // 50MB limit
};

const result = await processDocumentTextFromBuffer(fileBuffer, fileMimeType, options);
if (result.success) {
  console.log(`Extracted text from ${result.success.type} file:`, result.success.text);
} else {
  console.error('Failed to extract text:', result.failure?.message);
}
*/