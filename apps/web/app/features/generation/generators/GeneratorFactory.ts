// File path: apps/web/app/features/generation/generators/GeneratorFactory.ts
import { ECQGenerator } from './ECQGenerator';
import { TCQGenerator } from './TCQGenerator';
import { CoverLetterGenerator } from './CoverLetterGenerator';
import { OtherGenerator } from './OtherGenerator';
import { EssayGenerator } from './EssayGenerator';
import { DocumentType, GenerationSelection } from '@fedjobs/types';
import { ResumeGenerator } from './ResumeGenerator';

export class GeneratorFactory {
    /**
     * Creates the appropriate document generator based on the document type
     * @param type The type of document to generate
     * @param generationSelection The generation selection data
     * @returns An instance of the appropriate document generator
     */
    static createGenerator(
        type: DocumentType,
        generationSelection: GenerationSelection
    ): EssayGenerator {
        switch (type) {
            case 'ecq':
                if (!generationSelection.docInfo.ecqShortTitle) {
                    throw new Error("ECQ Short Title is required for ECQ generation");
                }
                return new ECQGenerator(generationSelection.docInfo.ecqShortTitle, generationSelection);
            case 'tcq':
                return new TCQGenerator(generationSelection);
            case 'cover_letter':
                return new CoverLetterGenerator(generationSelection);
            case 'resume':
                return new ResumeGenerator(generationSelection);
            case 'other':
                return new OtherGenerator(generationSelection);
            default:
                throw new Error(`Unsupported document type: ${type}`);
        }
    }
}