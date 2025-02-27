// File path: apps/web/app/_types/DocumentInfo.ts
import { ECQNamesType } from "./ECQCompetencies";

export type DocumentInfo = {
    isDummy: boolean;
    type: string;
    ecqShortTitle: ECQNamesType;
    essayPrompt: string;
    essayPromptSuggestions: string[];
    additionalDocInfo: string;
    length: number; 
    lengthUnit: 'words' | 'pages'; 
}