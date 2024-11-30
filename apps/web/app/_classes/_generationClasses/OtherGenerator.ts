import { GenerationSelection } from '@/app/_types/GenerationSelection';
import { PositionObject } from '../Position';
import { EssayGenerator } from './EssayGenerator';
import { JobInfo } from '@/app/_types/JobInfo';
import { StreamingTextArray } from '@/app/_types/StreamingTextArray';


export class OtherGenerator extends EssayGenerator {


    constructor(generationSelection: GenerationSelection) {
        super('cover_letter', generationSelection);
    }

    createPrompt(): string {
        
        const {
            docInfo,
            jobInfo,
            length,
            otherInfo,
            position,
            selectedAccomplishments,
            selectedActivities
        } = this._generationSelection
        const prompt = `Please write the following document, as described here: ${docInfo.additionalDocInfo}
                      

${this.jobDescription ? `____
The document you are writing is related to the following job description:
${this.jobDescription}` : ``}

____
The document you are writing relates to the following position:
    Position: ${position.title.title} at ${position.organization.name}, from ${position.date.startDate} to ${position.date.present ? 'Present' : position.date.endDate}.
        
    Selected Activities:
    - ${selectedActivities.join('\n- ')}
        
    Selected Accomplishments:\n- ${selectedAccomplishments.join('\n- ')}
        
    ${(otherInfo ?
        `_____
Finally consider the following information: ${otherInfo} ` : '')}

________
When writing the document, IT MUST BE NO MORE THAN ${length.toString()} WORDS.:
`;

        return prompt;
    }

    createParagraphPrompt(
        paragraphId: number,
        regenerationText: string,
        streamingTextArray: StreamingTextArray,
        ): string {
        const {
            docInfo,
            jobInfo,
            length,
            otherInfo,
            position,
            selectedAccomplishments,
            selectedActivities
        } = this._generationSelection;
        const paragraphText = streamingTextArray.find(item => 
                item.id === paragraphId
        )?.text ?? '';

        if (!paragraphText)
            throw new Error(`Error with paragraph text: ${paragraphText}`);

        const prompt = `Consider the following in updating a document as describe here: ${docInfo.additionalDocInfo}
${this.jobDescription ? `____
The document you are writing is related to the following job description:
${this.jobDescription}` : ``}
____

And the document relies on the following accomplishments:
    Position: ${position.title.title} at ${position.organization.name}, from ${position.date.startDate} to ${position.date.present ? 'Present' : position.date.endDate}.
        
    Selected Activities:
    - ${selectedActivities.join('\n- ')}
        
    Selected Accomplishments:\n- ${selectedAccomplishments.join('\n- ')}

    ${(otherInfo ?
        `_____
Finally consider the following information: ${otherInfo} ` : '')}

_____
Given that this is the current document:
        ${streamingTextArray.reduce((prev, curr) => {
            return prev + curr.text + '\n';
        }, '') }

Rewrite ONLY the following paragraph:
${paragraphText}

You MUST rewrite the paragraph with the following instructions: ${regenerationText}
`;

        return prompt;
    }
    getDescription(): string {
        return `Other Document`;
    }

    getFileNamePrefix(): string {
        return `Other-Document-`;
    }


}

