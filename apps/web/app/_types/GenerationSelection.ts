import { PositionObject } from "@/app/_classes/Position";

import { JobInfo } from "./JobInfo";
import { DocumentInfo } from "./DocumentInfo";


export type GenerationSelection = {
    position: PositionObject,
    selectedActivities: string[],
    selectedAccomplishments: string[],
    docInfo: DocumentInfo;
    otherInfo: string;
    jobInfo: JobInfo
    length: number 
}