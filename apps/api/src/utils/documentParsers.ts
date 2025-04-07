// apps/api/src/utils/documentParsers.ts
import mammoth from 'mammoth';
import pdf from 'pdf-parse';

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

/**
 * Configuration options for text extraction
 */
export interface TextExtractionOptions {
  preserveFormatting?: boolean;
  maxBufferSize?: number;
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
 * Extracts raw text from a Word document buffer with enhanced options.
 * @param buffer The buffer containing the Word document.
 * @param options TextExtractionOptions.
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
      styleMap: options.preserveFormatting
        ? [
            "p[style-name='Heading 1'] => h1:fresh",
            "p[style-name='Heading 2'] => h2:fresh",
            "p[style-name='Heading 3'] => h3:fresh"
          ]
        : undefined
    };

    const result = await mammoth.extractRawText(mammothOptions);
    return cleanUpText(result.value, options.preserveFormatting);
  } catch (error) {
    console.error("Error parsing Word document:", error);
    throw error;
  }
}

/**
 * Extracts text from a PDF buffer using `pdf-parse`.
 * @param buffer The buffer containing the PDF document.
 * @param options TextExtractionOptions.
 * @returns Extracted text.
 */
export async function extractTextFromPDFBuffer(
  buffer: Buffer,
  options: TextExtractionOptions = {}
): Promise<string> {
  try {
    // Optional: check the buffer size if maxBufferSize is set
    if (
      options.maxBufferSize &&
      buffer.length > options.maxBufferSize * 1024 * 1024
    ) {
      throw new Error(
        `PDF file size exceeds maximum allowed size of ${options.maxBufferSize}MB`
      );
    }

    // Parse PDF
    const parsed = await pdf(buffer);
    
    // Clean up the extracted text
    return cleanUpText(parsed.text, options.preserveFormatting);
  } catch (error) {
    console.error("Error parsing PDF document:", error);
    throw error;
  }
}

/**
 * Processes a document from a buffer and its MIME type with enhanced options.
 * @param buffer The buffer containing the document.
 * @param mimeType The MIME type of the document.
 * @param options TextExtractionOptions.
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
      case 'application/pdf': {
        text = await extractTextFromPDFBuffer(buffer, options);
        type = 'pdf';
        break;
      }
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
        text = await extractTextFromWordBuffer(buffer, options);
        type = 'docx';
        break;
      }
      case 'application/msword': {
        text = await extractTextFromWordBuffer(buffer, options);
        type = 'doc';
        break;
      }
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