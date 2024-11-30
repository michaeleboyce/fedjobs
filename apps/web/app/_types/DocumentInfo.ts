import { ECQNamesType } from "./ECQCompetencies";

export type DocumentInfo = {
    isDummy: boolean;
    type: string;
    ecqShortTitle: ECQNamesType;
    essayPrompt: string;
    essayPromptSuggestions: string[];
    additionalDocInfo: string;
}