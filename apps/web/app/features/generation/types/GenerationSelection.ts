// File path: apps/web/app/features/generation/types/GenerationSelection.ts
// GenerationSelection.ts
import { PositionObject } from "@/app/shared/types/Position";
import { DocumentInfo } from "./DocumentInfo";
import { JobInfo } from "@fedjobs/types";

export type SelectedPositionData = {
  position: PositionObject;
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
