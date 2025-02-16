// File path: apps/web/app/_actions/files/fileActions.ts
'use server'; // This module executes on the server side.

import axios from 'axios';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { config } from 'dotenv';
import { deleteVectorizedPositions, generateKeyFromFileName } from '@fedjobs/utils';
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { DocumentRepository, ParsingRepository } from "@fedjobs/database";
import { EssayGenerator, SaveDocumentResult } from "@/app/_classes/_generationClasses/EssayGenerator";
import { authenticateUser, ALLOWED_FILE_TYPES, MAX_FILE_SIZE } from "@fedjobs/utils";
import { DocumentType, ParseRequest } from '@fedjobs/types';

config(); // Load environment variables.

type ProcessDocumentResponse =
  | { success: { url: string; document: any } }
  | { failure: string };

type GetDocumentSignedURLResponse =
  | { success: { url: string; documentId: number } }
  | { failure: string };

// Initialize the S3 client.
const s3Client = new S3Client({
  region: process.env.AWS_BUCKET_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_PROD!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});
const bucket = process.env.AWS_BUCKET_NAME!;

// Instantiate repository objects.
const documentRepo = new DocumentRepository();
const parsingRepo = new ParsingRepository();

/**
 * Processes an uploaded file by validating, uploading to S3,
 * saving a document record via the repository, and initiating parsing if needed.
 *
 * @param data - FormData containing the uploaded file.
 * @param addToKnowledgeBank - Whether to add the document to the knowledge bank.
 * @param documentType - The type of the document (default: 'resume').
 * @param description - A description of the document.
 * @param content - The content extracted from the document.
 * @returns A promise resolving to a ProcessDocumentResponse.
 */
export async function processFile(
  data: FormData,
  addToKnowledgeBank: boolean,
  documentType: DocumentType = 'resume',
  description: string = '',
  content: string = ''
): Promise<ProcessDocumentResponse> {
  // Authenticate the user.
  const user = await authenticateUser();
  if (!user) {
    return { failure: "User authentication failed." };
  }

  // Extract and validate the file.
  const file = data.get('file') as File;
  if (!file || !file.name || !file.type || !file.size) {
    return { failure: "Invalid file data provided." };
  }
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return { failure: `File type "${file.type}" is not allowed.` };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { failure: `File size ${file.size} exceeds the maximum allowed size of ${MAX_FILE_SIZE} bytes.` };
  }

  try {
    // Generate S3 key and convert the file into a Buffer.
    const s3Key = generateKeyFromFileName(file.name);
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload the file to S3.
    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: s3Key,
        Body: buffer,
        ContentType: file.type,
        ContentLength: file.size,
        Metadata: {
          userId: user.id,
          fileName: file.name,
        },
      })
    );

    // Construct the public URL.
    const region = process.env.AWS_BUCKET_REGION!;
    const s3Url = `https://${bucket}.s3.${region}.amazonaws.com/${s3Key}`;

    // Insert a new document record using the repository.
    const document = await documentRepo.insert({
      userId: user.id,
      type: documentType,
      url: s3Url,
      description,
      inKnowledgeBank: addToKnowledgeBank,
      content,
      name: file.name,
      s3Key: s3Key,
    });

    // For non-resume documents, mark as parsed immediately.
    if (documentType !== 'resume') {
      await documentRepo.update(document.id, { isParsed: true });
    } else {
      // For resumes, check for existing parsing records.
      const existingParsings = await parsingRepo.getParsingsByDocumentId(document.id);
      if (existingParsings.length === 0) {
        const parseRequest: ParseRequest = {
          text: content,
          userId: user.id,
          documentId: document.id,
          filename: file.name,
          streaming: true,
          addToKnowledgeBank: addToKnowledgeBank,
        };

        try {
          // Determine API URL (adjust as needed).
          const API_URL = process.env.NEXT_PUBLIC_VERCEL_ENV === "production"
            ? "https://fedjobs-api-production.up.railway.app"
            : "http://localhost:3001";
          const response = await axios.post(`${API_URL}/api/parse`, parseRequest, {
            headers: { 'Content-Type': 'application/json' },
          });
          if (response.status !== 200) {
            console.error("Failed to initiate parsing:", response.data);
          }
          const { parseId } = response.data;
          if (!parseId) {
            console.error("No parseId returned from parsing service.");
          }
        } catch (error: any) {
          console.error("Error initiating parsing via API:", error.response?.data || error.message);
        }
      }
    }

    // Return success with document details.
    return { success: { url: s3Url, document } };
  } catch (error: any) {
    console.error("Error processing file:", error);
    return { failure: error.message || "An unknown error occurred during file processing." };
  }
}

/**
 * Retrieves a signed URL for accessing a document.
 *
 * @param documentId - The ID of the document.
 * @returns A promise resolving to a GetDocumentSignedURLResponse.
 */
export async function getDocumentSignedURL(documentId: number): Promise<GetDocumentSignedURLResponse> {
  const { isAuthenticated, getUser } = await getKindeServerSession();
  if (!(await isAuthenticated())) {
    return { failure: 'Not authenticated' };
  }
  const user = await getUser();
  if (!user || !user.id) {
    return { failure: 'User not found' };
  }
  const document = await documentRepo.getById(documentId, user.id);
  if (!document) {
    return { failure: 'Document not found or not authorized' };
  }
  const getObjectCommand = new GetObjectCommand({
    Bucket: bucket,
    Key: document.s3Key,
  });
  try {
    const url = await getSignedUrl(s3Client, getObjectCommand, { expiresIn: 300 });
    return { success: { url, documentId: document.id } };
  } catch (error) {
    console.error('Error generating signed URL:', error);
    return { failure: 'Error generating signed URL' };
  }
}

/**
 * Deletes a document from S3 and via the DocumentRepository.
 *
 * @param documentId - The ID of the document to delete.
 * @returns A promise resolving to a success or failure message.
 */
export async function deleteDocument(documentId: number): Promise<{ success?: string; failure?: string }> {
  const { isAuthenticated, getUser } = await getKindeServerSession();
  if (!(await isAuthenticated())) {
    return { failure: 'Not authenticated' };
  }
  const user = await getUser();
  if (!user || !user.id) {
    return { failure: 'User not found' };
  }
  const documentToDelete = await documentRepo.getById(documentId, user.id);
  if (!documentToDelete) {
    return { failure: 'Document not found or not authorized' };
  }
  try {
    const deleteObjectCommand = new DeleteObjectCommand({
      Bucket: bucket,
      Key: documentToDelete.s3Key,
    });
    await s3Client.send(deleteObjectCommand);
    await documentRepo.delete(documentId);
    await deleteVectorizedPositions(documentId.toString());
    return { success: 'Document deleted successfully' };
  } catch (error) {
    console.error('Error deleting document:', error);
    return { failure: 'Error deleting document' };
  }
}

/**
 * Processes a new ECQ document using EssayGenerator.
 *
 * @param text - The content of the ECQ document.
 * @param ecqShortTitle - The short title of the ECQ topic.
 * @returns A promise resolving to a SaveDocumentResult.
 */
export async function processNewECQDocument(text: string, ecqShortTitle: string): Promise<SaveDocumentResult> {
  const { isAuthenticated, getUser } = await getKindeServerSession();
  if (!(await isAuthenticated()))
    return { status: 'error', body: { message: 'Not authenticated!' } };
  const user = await getUser();
  if (!user)
    return { status: 'error', body: { message: 'Error getting user information!' } };
  return await EssayGenerator.SaveDocument(user.id, text, `ECQ Essay for the ECQ Topic: ${ecqShortTitle}`);
}
