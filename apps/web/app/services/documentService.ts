// File path: apps/web/app/services/documentService.ts
import { DocumentRepository } from '@fedjobs/database';

const documentRepo = new DocumentRepository();

export const getDocumentById = async (documentId: number, userId?: string) => {
  return documentRepo.getById(documentId, userId);
};

export const getDocumentsByUserId = async (userId: string) => {
  return documentRepo.getByUserId(userId);
};

export const saveDocument = async (documentData: any) => {
  return documentRepo.insert(documentData);
};

export const updateDocument = async (documentId: number, updateData: any) => {
  return documentRepo.update(documentId, updateData);
};

export const deleteDocument = async (documentId: number) => {
  return documentRepo.delete(documentId);
};
