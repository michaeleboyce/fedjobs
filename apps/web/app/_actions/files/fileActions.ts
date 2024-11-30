'use server'
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { config } from 'dotenv';
import crypto  from 'crypto';
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { db, eq, and} from "@/app/_db";
import { documents as documentsTable, Document} from "@/app/_db/schema/documents"
import { ECQGenerator } from "@/app/_classes/_generationClasses/ECQGenerator";
import { EssayGenerator, SaveDocumentResult } from "@/app/_classes/_generationClasses/EssayGenerator";
import { retrieveAndDeleteDocuments, vectorizeDocument } from "../vectorize/vectorizeActions";
import { parsings as parsingsTable } from "@/app/_db/schema/parsings";
import parseDocument from "@/app/defer/parseDocument";
export async function runDeferGetJSONFromDoc(text: string, documentId: number){
  //await buildJSONfromDoc(text, documentId);
}
config();
//import { auth } from "@/auth"

//TODO: used this website: https://www.nexttonone.lol/upload-s3
type SignedURLResponse = { failure?: undefined; success: { url: string } }
  | { failure: string; success?: undefined }

type ProcessDocumentResponse = 
{ failure?: undefined; success: { url: string; document: Document;  } } |
{ failure: string; success?: undefined };
//TODO: Fix This will allow us to handle error cases and success cases, but really i would suggest you use something like https://next-safe-action.dev/
type GetDocumentSignedURLResponse = 
{ failure?: undefined; success: { url: string;  documentId: number} } |
{ failure: string; success?: undefined };

const maxFileSize = 1048576 * 100 // 10 MB

const s3Client = new S3Client({
  region: process.env.AWS_BUCKET_REGION!,
  credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_PROD!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});
const bucket = process.env.AWS_BUCKET_NAME!;

const allowedFileTypes = [
    "application/msword", // for .doc files
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // for .docx files
    "application/pdf"
  ];

const generateFileName = (bytes = 32) => crypto.randomBytes(bytes).toString("hex")
export async function processFile(data: FormData, addToKnowledgeBank: boolean, documentType: string = 'resume', description: string = '', content: string = ''): Promise<ProcessDocumentResponse>{
  const { isAuthenticated, getUser } = await getKindeServerSession();
  const authenticated = await isAuthenticated();
  const user = await getUser()
  if (!authenticated) {
    return { failure: "not authenticated" }
  }

  if (!user || !user.id){
    return {failure: `Error processing user: ${JSON.stringify(user)}`};
  }
  try {
    const file = data.get('file') as File;

    if (!file || !file.name || !file.type || !file.size)
      throw new Error(`File: ${file}, file.name: ${file.name}, file.type: ${file.type}, file.size: ${file.size}`);

    const signedUrlResponse = await getSignedURL(file.name, file.type, file.size, user?.id);
    if (signedUrlResponse.failure)
      return signedUrlResponse;

    const url = signedUrlResponse.success?.url;
    if (!url)
      return {failure: "No signed URL returned"};

    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": file.type,
      },
      body: file,
    });

    if (!response.ok)
      return {failure: "Unable to upload file to S3 bucket"};

    let results: Document[] = []
    results = await db
    .insert(documentsTable)
    .values({
        type: documentType,
        url: url.split("?")[0],
        userId: user?.id!,
        description: description,
        inKnowledgeBank: addToKnowledgeBank,
        content: content,
        name: file.name,
        
    })
    .returning();
    //TODO: finish vectorization
    // const vectorizeResult = await vectorizeDocument(content, file.name, results[0].id, documentType, user.id);
    // if (vectorizeResult.status !== 'ok')
    //   return {failure: 'Unable to vectorize docuemnt'};
    
    if (documentType !== 'resume'){
      results = await db
        .update(documentsTable)
        .set({isParsed: true})
        .where(eq(documentsTable.id, results[0].id))
        .returning();
    } else {
      const parsings = await db
        .select()
        .from(parsingsTable)
        .where(eq(parsingsTable.documentId, results[0].id))
        .execute();
      if (parsings.length === 0)
        await parseDocument(content, results[0].id, user.id)
    }

    
    return {success: {url, document: results[0]}}
  } 
    catch (error: any){
      if (error instanceof Error)
        return {failure: error.message};
      else
        return {failure: 'Unknown Error'};
    }  
}

export async function processNewECQDocument(text: string, ecqShortTitle: string): Promise<SaveDocumentResult> {
  const { isAuthenticated, getUser } = getKindeServerSession();
  if (!(await isAuthenticated()))
    return {status: 'error', body: {message: 'Not authenticated!'}};
  const user = await getUser();
  if (!user)
    return {status: 'error', body: {message: 'Error getting user information!'}};
  return await EssayGenerator.SaveDocument(user.id, text, `ECQ Essay for the ECQ Topic: ${ecqShortTitle}`);
}

async function getSignedURL(fileName: string, fileType: string, fileSize: number, userId: string): Promise<SignedURLResponse> {
      // first just make sure in our code that we're only allowing the file types we want
    if (!allowedFileTypes.includes(fileType)) {
        return { failure: "File type not allowed" }
    }

    if (fileSize > maxFileSize) {
        return { failure: "File size too large" }
    }
    
    const putObjectCommand = new PutObjectCommand({
      Bucket: bucket,
      Key: fileName,
      ContentType: fileType,
      ContentLength: fileSize,
      Metadata: {
        userId: userId
      }
    })
    try {
      const url = await getSignedUrl(
        s3Client,
        putObjectCommand,
        { expiresIn: 60 } // 60 seconds
      )
    
      return {success: {url}};
    } catch (error: any){
      if (error instanceof Error)
        return {failure: error.message};
      else
        return {failure: 'Unknown Error'};
    }
  }



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
            eq(documentsTable.userId, user?.id)
        ))
        .execute();

    if (document.length === 0) {
        return { failure: 'Document not found or not authorized' };
    }

    const getObjectCommand = new GetObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME!,
        Key: document[0].name,
    });

    try {
        const url = await getSignedUrl(s3Client, getObjectCommand, { expiresIn: 300 }); // URL expires in 5 minutes
        return { success: { url, documentId: document[0].id} };
    } catch (error) {
        console.error('Error generating signed URL:', error);
        return { failure: 'Error generating signed URL' };
    }
}

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
  
    // Initialize S3 client
    const s3Client = new S3Client({
      region: process.env.AWS_BUCKET_REGION!,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_PROD!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  
    // Delete the file from S3
    const deleteObjectCommand = new DeleteObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: documentToDelete[0].name,
    });
  
    try {
      await s3Client.send(deleteObjectCommand);
  
      // If the S3 delete was successful, delete the record from the database
      await db
        .delete(documentsTable)
        .where(eq(documentsTable.id, documentId))
        .execute();
  
      await retrieveAndDeleteDocuments(`${documentId}#`);
      return { success: 'Document deleted successfully' };
    } catch (error) {
      console.error('Error deleting document:', error);
      return { failure: 'Error deleting document' };
    }
  }

  export async function getUpdatedDocumentStatus(documentId: number){
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