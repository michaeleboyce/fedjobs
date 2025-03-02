// File path: apps/web/app/features/generation/types/GeneratedDocumentInformation.ts
import { ECQNamesTypeWithEmptyString } from "./ECQCompetencies";

export type GeneratedDocumentInformation = {
    title: string;
    type: string;
    ecqName: ECQNamesTypeWithEmptyString | undefined;
    dateCreated: string;
    documentId: number;
  };