// File path: packages/types/src/GenerationTypes.ts
import { ECQNamesType, ECQNamesTypeWithEmptyString } from './ECQCompetencies';
import { Position } from './ResumeTypes';
import { JobInfo } from './JobTypes';

export type DocumentInfo = {
  isDummy: boolean;
  type: string;
  ecqShortTitle: ECQNamesType | undefined;
  essayPrompt: string;
  essayPromptSuggestions: string[];
  additionalDocInfo: string;
  length: number; 
  lengthUnit: 'words' | 'pages'; 
};

export type StreamingTextArray = Array<{id: number, text: string}>;

export type GeneratedDocumentInformation = {
  title: string;
  type: string;
  ecqName: ECQNamesTypeWithEmptyString | undefined;
  dateCreated: string;
  documentId: number;
};

export type SelectedPositionData = {
  position: Position;
  selectedActivities: string[];       
  selectedAccomplishments: string[];  
};

export type GenerationSelection = {
  positions: SelectedPositionData[];
  docInfo: DocumentInfo;
  otherInfo: string;
  jobInfo: JobInfo;
  length: number;
  lengthUnit: 'words' | 'pages'; 
};

export interface PositionSelectionState {
  selectedActivities: number[];
  selectedAccomplishments: number[];
}