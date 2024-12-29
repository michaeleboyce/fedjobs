// GenerationSelection.ts
import { PositionObject } from "@/app/_classes/Position";
import { DocumentInfo } from "./DocumentInfo";
import { JobInfo } from "./JobInfo";

export type SelectedPositionData = {
  position: PositionObject;
  selectedActivities: string[];       // or indexes (number[]) if you prefer
  selectedAccomplishments: string[];  // or indexes
};

export type GenerationSelection = {
  positions: SelectedPositionData[];
  docInfo: DocumentInfo;
  otherInfo: string;
  jobInfo: JobInfo;
  length: number;
};
