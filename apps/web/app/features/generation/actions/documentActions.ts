// File path: apps/web/app/features/generation/actions/documentActions.ts
// app/features/generation/actions/documentActions.ts
'use server';

import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { DocumentType } from '@fedjobs/types';
import { DocumentUploadService, SaveDocumentResult } from '@/app/services/documentUploadService';

/**
 * Server action to save a generated document
 */
export async function saveGeneratedDocument(
  content: string,
  documentType: DocumentType,
  title: string,
  description: string
): Promise<SaveDocumentResult> {
  // 1. Authenticate the user
  const { isAuthenticated, getUser } = await getKindeServerSession();
  if (!(await isAuthenticated())) {
    return { 
      status: 'error', 
      body: { message: 'User authentication failed' } 
    };
  }
  
  const user = await getUser();
  if (!user?.id) {
    return { 
      status: 'error', 
      body: { message: 'Error retrieving user information' } 
    };
  }
  
  // 2. Call the document service to handle the saving process
  return await DocumentUploadService.saveDocument({
    userId: user.id,
    content,
    documentType,
    title,
    description
  });
}