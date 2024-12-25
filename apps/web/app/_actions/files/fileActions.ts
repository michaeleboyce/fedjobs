'use server'; // Indicates that this module should be executed on the server side.

import axios from 'axios'; // Import Axios for HTTP requests.
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { config } from 'dotenv';
import crypto from 'crypto';
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { db, eq, and } from "@fedjobs/database";
import { documents as documentsTable, Document } from "@fedjobs/database";
import { parsings as parsingsTable, NewParsing } from "@fedjobs/database";
import { ECQGenerator } from "@/app/_classes/_generationClasses/ECQGenerator";
import { EssayGenerator, SaveDocumentResult } from "@/app/_classes/_generationClasses/EssayGenerator";
import { retrieveAndDeleteDocuments, vectorizeDocument } from "../vectorize/vectorizeActions";
// Removed unused import: import parseDocument from "@/app/defer/parseDocument";
import { authenticateUser, ALLOWED_FILE_TYPES, MAX_FILE_SIZE, uploadFile } from "@fedjobs/utils";
import { getParsingsByDocId, insertDocument, insertParsing, updateDocument } from '@fedjobs/database';
import { DocumentType } from '@fedjobs/types';

config(); // Initialize dotenv to load environment variables.

// Define response types for better type safety.
type SignedURLResponse =
  | { failure?: undefined; success: { url: string } }
  | { failure: string; success?: undefined };

type ProcessDocumentResponse =
  | { failure?: undefined; success: { url: string; document: Document; } }
  | { failure: string; success?: undefined };

type GetDocumentSignedURLResponse =
  | { failure?: undefined; success: { url: string; documentId: number } }
  | { failure: string; success?: undefined };


// Initialize the S3 client with credentials and region from environment variables.
const s3Client = new S3Client({
  region: process.env.AWS_BUCKET_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_PROD!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});
const bucket = process.env.AWS_BUCKET_NAME!; // Your S3 bucket name.

// Utility function to generate a unique file name using random bytes.
const generateFileName = (bytes = 32) => crypto.randomBytes(bytes).toString("hex");

/**
 * Processes an uploaded file by performing validation, uploading to S3,
 * saving to the database, and initiating parsing or vectorization as needed.
 * 
 * @param data - FormData containing the uploaded file and related fields.
 * @param addToKnowledgeBank - Indicates whether the document should be added to the knowledge bank.
 * @param documentType - The type of the document (default is 'resume').
 * @param description - A description of the document.
 * @param content - The content extracted from the document.
 * @returns A promise resolving to either a success object with the document details or a failure object with an error message.
 */
export async function processFile(
  data: FormData,
  addToKnowledgeBank: boolean,
  documentType: DocumentType = 'resume',
  description: string = '',
  content: string = ''
): Promise<ProcessDocumentResponse> {

  // Authenticate the user making the request.
  const user = await authenticateUser();

  if (!user) {
    return { failure: "User authentication failed." };
  }

  // Extract the file from the FormData.
  const file = data.get('file') as File;

  // Validate that the file exists and contains necessary properties.
  if (!file || !file.name || !file.type || !file.size) {
    return { failure: "Invalid file data provided." };
  }

  // Validate the file type against the allowed types.
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return { failure: `File type "${file.type}" is not allowed.` };
  }

  // Validate the file size against the maximum allowed size.
  if (file.size > MAX_FILE_SIZE) {
    return { failure: `File size ${file.size} exceeds the maximum allowed size of ${MAX_FILE_SIZE} bytes.` };
  }

  try {
    // Upload the file to S3 and get the signed URL.
    const uploadResponse = await uploadFile(file.name, file.type, user.id, file.size);

    if (uploadResponse.status === 'failure') {
      return { failure: uploadResponse.message };
    }

    const signedUrl = uploadResponse.url;
    // Insert the document record into the database.
    let document: Document = await insertDocument({
      type: documentType,
      url: signedUrl.split("?")[0], // Strip query parameters from the URL.
      userId: user.id,
      description,
      inKnowledgeBank: addToKnowledgeBank,
      content,
      name: generateFileName() + "_" + file.name, // Use a unique file name.
    });

    // Determine the next steps based on the document type.
    if (documentType !== 'resume') {
      // For non-resume documents, mark them as parsed in the database.
      await updateDocument(document.id, { isParsed: true });
    } else {
      // For resume documents, check if they have already been parsed.
      const existingParsings = await getParsingsByDocId(document.id);
      if (existingParsings.length === 0) {
        // If not parsed, initiate the parsing process by creating a new parsing record.
        const parsePayload = {
          text: content,
          userId: user.id,
          documentId: document.id,
          streaming: true, // Set to true to enable streaming and DB logging.
        };

        // Initiate parsing
        const parseResponse = await initiateParsing(parsePayload);

        if (parseResponse.failure) {
          console.error("Failed to initiate parsing:", parseResponse.failure);
          // Optionally, you can choose to delete the uploaded document or notify the user.
        }
        // If parseResponse.success exists, the parsing task has been initiated.
      }
    }

    // Return a success response with the document's signed URL and details.
    return { success: { url: signedUrl, document } };
  } catch (error: any) {
    console.error("Error processing file:", error);
    return { failure: error.message || "An unknown error occurred during file processing." };
  }
};

/**
 * Initiates the parsing process by creating a new parsing record and calling the /api/parse endpoint.
 * 
 * @param payload - The payload containing text, userId, documentId, and streaming flag.
 * @returns A promise resolving to either a success object or a failure object.
 */
async function initiateParsing(payload: {
  text: string;
  userId: string;
  documentId: number;
  streaming: boolean;
}): Promise<{ success?: any; failure?: string }> {
  try {
    // Insert a new parsing record into the parsings table.
    const newParsing: NewParsing = {
      userId: payload.userId,
      type: 'resume', // Assuming 'resume' is the only type needing parsing.
      prompt: createPromptXML(payload.text),
      completion: '',
      documentId: payload.documentId,
      analysisPercent: 0,
      isComplete: false,
      temperature: '0', // Adjust based on your requirements.
    };

    const parsingRecord = await insertParsing(newParsing);

    if (!parsingRecord.id) {
      throw new Error("Failed to create a new parsing record.");
    }

    // Prepare the payload for the /api/parse API.
    const parseApiPayload = {
      text: payload.text,
      userId: payload.userId,
      documentId: payload.documentId,
      parsingId: parsingRecord.id, // Include parsingId to track the task.
      streaming: payload.streaming,
    };

    // Determine the API base URL from environment variables or use a relative path.
    const API_BASE_URL = process.env.API_BASE_URL || ''; // Ensure this is set correctly.

    // Make a POST request to the /api/parse endpoint.
    const response = await axios.post(`${API_BASE_URL}/api/parse`, parseApiPayload, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Handle the response based on whether it's streaming or not.
    if (response.data.streaming) {
      // Streaming: The parsing is being handled asynchronously.
      // The response includes a parseId for tracking.
      const parseId = parsingRecord.id; // Using parsingRecord.id as parseId.
      console.log(`Parsing initiated with parseId: ${parseId}`);
      // No need to store parseId in documents since parsings are linked via documentId.
      return { success: { parseId } };
    } else {
      // Non-streaming: Parsing completed synchronously.
      // Update the parsing record with the annotated text and mark it as parsed.
      const annotatedText = response.data.annotatedText;
      await updateParsingRecord(parsingRecord.id, { completion: annotatedText, isComplete: true, analysisPercent: 100 });
      console.log(`Parsing completed for documentId: ${payload.documentId}`);
      return { success: { annotatedText } };
    }
  } catch (error: any) {
    console.error("Error initiating parsing:", error);
    return { failure: error.response?.data?.message || error.message || "Failed to initiate parsing." };
  }
}

/**
 * Creates the prompt XML for parsing.
 * 
 * @param text - The text to parse.
 * @returns The formatted prompt XML string.
 */
function createPromptXML(text: string): string {
  return `Please annotate the provided resume text by adding specific XML-style tags, ensuring that the original text is preserved exactly as it is, without any modifications, deletions, or summarizations. Each section describing a position should be enclosed within <position> and </position> tags. Within these, use <date startDate="mm/dd/yyyy" endDate="mm/dd/yyyy" present=boolean> tags for the dates of the position, <title title="Capitalized position title"> for the job title, <organization organization="Capitalized organization name"> for the organization name, and <details> for the full details of the position, including activities and accomplishments. Every distinct accomplishment within the <details> section should be individually wrapped in <accomplishment> tags. Each description of duties and assignments should be wrapped in a <activity> tag. If any text does not clearly fit into these categories, leave it untagged but ensure it remains unchanged. For example:

<html>
  <position>
    <organization organization="Acme Inc.">ACME INC. for Leaders and Champions</organization>
    <title title="Fellow">Annual Fellow Selected through a Competitive Application</title>
    <date startDate="10/01/1991" endDate="11/1/1995" present=false>October, 1991 - November 1995</date>
    <details>
      <activity>Job description and responsibilities.</activity>
      <accomplishment>Specific accomplishment 1.</accomplishment>
      <accomplishment>Specific accomplishment 2.</accomplishment>
      Miscellaneous other text
    </details>
  </position>
</html>

Please follow this structure for the entire resume, maintaining the integrity of the original text. Provide only the XML output without additional comments and complete the ENTIRE document. The text to parse is: ${text}`;
}

/**
 * Updates a parsing record in the parsings table.
 * 
 * @param parsingId - The ID of the parsing record to update.
 * @param updates - The fields to update.
 * @returns A promise resolving when the update is complete.
 */
async function updateParsingRecord(parsingId: number, updates: Partial<typeof parsingsTable.$inferInsert>): Promise<void> {
  await db
    .update(parsingsTable)
    .set(updates)
    .where(eq(parsingsTable.id, parsingId));
}

/**
 * Retrieves a signed URL for accessing a document.
 * 
 * @param documentId - The ID of the document.
 * @returns A promise resolving to either a success object with the signed URL or a failure object with an error message.
 */
export async function getDocumentSignedURL(documentId: number): Promise<GetDocumentSignedURLResponse> {
  const { isAuthenticated, getUser } = await getKindeServerSession();
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    return { failure: 'Not authenticated' };
  }

  const user = await getUser();
  if (!user || !user.id) {
    return { failure: 'User not found' };
  }

  const document = await db
    .select()
    .from(documentsTable)
    .where(and(
      eq(documentsTable.id, documentId),
      eq(documentsTable.userId, user.id)
    ))
    .execute();

  if (document.length === 0) {
    return { failure: 'Document not found or not authorized' };
  }

  const getObjectCommand = new GetObjectCommand({
    Bucket: bucket,
    Key: document[0].name,
  });

  try {
    const url = await getSignedUrl(s3Client, getObjectCommand, { expiresIn: 300 }); // URL expires in 5 minutes.
    return { success: { url, documentId: document[0].id } };
  } catch (error) {
    console.error('Error generating signed URL:', error);
    return { failure: 'Error generating signed URL' };
  }
}

/**
 * Deletes a document both from S3 and the database.
 * 
 * @param documentId - The ID of the document to delete.
 * @returns A promise resolving to either a success message or a failure message.
 */
export async function deleteDocument(documentId: number): Promise<{ success?: string; failure?: string }> {
  const { isAuthenticated, getUser } = await getKindeServerSession();
  const authenticated = await isAuthenticated();

  if (!authenticated) {
    return { failure: 'Not authenticated' };
  }

  const user = await getUser();
  if (!user || !user.id) {
    return { failure: 'User not found' };
  }

  const documentToDelete = await db
    .select()
    .from(documentsTable)
    .where(and(
      eq(documentsTable.id, documentId),
      eq(documentsTable.userId, user.id)
    ))
    .execute();

  if (documentToDelete.length === 0) {
    return { failure: 'Document not found or not authorized' };
  }

  try {
    // Delete the file from S3.
    const deleteObjectCommand = new DeleteObjectCommand({
      Bucket: bucket,
      Key: documentToDelete[0].name,
    });
    await s3Client.send(deleteObjectCommand);

    // Delete the record from the database.
    await db
      .delete(documentsTable)
      .where(eq(documentsTable.id, documentId))
      .execute();

    // Optionally, perform additional cleanup or deletion logic.
    await retrieveAndDeleteDocuments(`${documentId}#`);
    return { success: 'Document deleted successfully' };
  } catch (error) {
    console.error('Error deleting document:', error);
    return { failure: 'Error deleting document' };
  }
}

/**
 * Retrieves the updated status of a document.
 * 
 * @param documentId - The ID of the document.
 * @returns A promise resolving to the document details or undefined if not found.
 */
export async function getUpdatedDocumentStatus(documentId: number) {
  const docs = await db
    .select()
    .from(documentsTable)
    .where(eq(documentsTable.id, documentId))
    .execute();
  if (docs.length <= 0)
    return undefined;
  else
    return docs[0];
}

/**
 * Processes a new ECQ document by saving it using the EssayGenerator.
 * 
 * @param text - The content of the ECQ document.
 * @param ecqShortTitle - The short title of the ECQ topic.
 * @returns A promise resolving to the result of the save operation.
 */
export async function processNewECQDocument(text: string, ecqShortTitle: string): Promise<SaveDocumentResult> {
  const { isAuthenticated, getUser } = getKindeServerSession();
  if (!(await isAuthenticated()))
    return { status: 'error', body: { message: 'Not authenticated!' } };
  const user = await getUser();
  if (!user)
    return { status: 'error', body: { message: 'Error getting user information!' } };
  return await EssayGenerator.SaveDocument(user.id, text, `ECQ Essay for the ECQ Topic: ${ecqShortTitle}`);
}

/**
 * Generates a signed URL for uploading a file to S3.
 * 
 * @param fileName - The name of the file.
 * @param fileType - The MIME type of the file.
 * @param fileSize - The size of the file in bytes.
 * @param userId - The ID of the user uploading the file.
 * @returns A promise resolving to either a success object with the signed URL or a failure object with an error message.
 */
async function getSignedURL(fileName: string, fileType: string, fileSize: number, userId: string): Promise<SignedURLResponse> {
  // Ensure only allowed file types are processed.
  if (!ALLOWED_FILE_TYPES.includes(fileType)) {
    return { failure: "File type not allowed" };
  }

  if (fileSize > MAX_FILE_SIZE) {
    return { failure: "File size too large" };
  }


  const putObjectCommand = new PutObjectCommand({
    Bucket: bucket,
    Key: fileName,
    ContentType: fileType,
    ContentLength: fileSize,
    Metadata: {
      userId: userId
    }
  });

  try {
    const url = await getSignedUrl(
      s3Client,
      putObjectCommand,
      { expiresIn: 60 } // 60 seconds
    );

    return { success: { url } };
  } catch (error: any) {
    if (error instanceof Error)
      return { failure: error.message };
    else
      return { failure: 'Unknown Error' };
  }
}