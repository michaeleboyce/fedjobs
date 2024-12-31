// File path: apps/web/app/_utils/documentParsing.ts
'use server';
import mammoth from 'mammoth';
import pdf from 'pdf-parse/lib/pdf-parse';
import { ProcessDocumentResponse } from '@/app/_types/FunctionReturns';


export async function parseWordDocumentArrayBuffer(fileBuffer: ArrayBuffer): Promise<string>{
  try {
    const result = await mammoth.extractRawText({arrayBuffer: fileBuffer});
    return cleanUpText(result.value); // result.value contains the plain text
  } catch (error) {
    console.error("Error parsing Word document:", error);
    throw error;
  }
}
export async function processDocumentFromFormData(formData: FormData): Promise<ProcessDocumentResponse> {
  try {
    const file = formData.get('file') as File | null;
    if (!file) throw new Error('No file provided');
    if (file.type === 'application/pdf') {
      const text = await extractTextFromPDF(file);
      return { success: { text, type: 'pdf' } };
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const text = await extractTextFromWord(file);
      return { success: { text, type: 'docx' } };
    } else if (file.type === 'application/msword') {
      const text = await extractTextFromWord(file);
      return { success: { text, type: 'doc' } };
    } else {
      throw new Error('Unsupported file type');
    }
  } catch (error) {
    const errorMessage = (error as Error).message || 'Unknown error';
    return { failure: { message: errorMessage, isInvalidDocType: errorMessage.includes('Unsupported file type') } };
  }
}

async function extractTextFromWord(file: File): Promise<string> {
  const arrayBuffer =  await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer);
  const result = await mammoth.extractRawText({ buffer: buffer });
  return result.value; // Optionally, add cleanup or processing
}

async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const data = await pdf({ data: arrayBuffer });
  return data.text;
}

// export async function parseWordDocumentFromFormData(formData: FormData){
//   try {
//     const file = formData.get('file') as File;
//     const result = await mammoth.extractRawText({arrayBuffer: await file.arrayBuffer()});
//     return cleanUpText(result.value);
//   } catch (error){
//     console.error(error);
//     throw error;
//   }
// }

export async function parseWordDocumentBuffer(fileBuffer: Buffer): Promise<string>{
  try {
    const result = await mammoth.extractRawText({ buffer: fileBuffer });
    return cleanUpText(result.value); // result.value contains the plain text
  } catch (error) {
    console.error("Error parsing Word document:", error);
    throw error;
  }
}

function cleanUpText(text: string): string {
  // Remove leading/trailing whitespace
  let cleanedText = text.trim();

  // Replace various types of line breaks with a standard format (\n)
  cleanedText = cleanedText.replace(/(\r\n|\r|\n)/g, '\n\n');

  // Replace multiple spaces with a single space
  cleanedText = cleanedText.replace(/\s+/g, ' ');

  // Optional: Additional cleanup steps can be added here, such as
  // removing special characters or handling section delimiters

  return cleanedText;
}

