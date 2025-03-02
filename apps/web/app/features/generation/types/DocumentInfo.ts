// File path: apps/web/app/features/generation/types/DocumentInfo.ts
import { ECQNamesType } from './ECQCompetencies';

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