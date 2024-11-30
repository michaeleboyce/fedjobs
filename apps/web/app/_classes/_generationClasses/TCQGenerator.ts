import { GenerationSelection } from '@/app/_types/GenerationSelection';
import { PositionObject } from '../Position';
import { EssayGenerator } from './EssayGenerator';
import { JobInfo } from '@/app/_types/JobInfo';
import { StreamingTextArray } from '@/app/_types/StreamingTextArray';


export class TCQGenerator extends EssayGenerator {


    constructor(generationSelection: GenerationSelection) {
        super('tcq', generationSelection);
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
        } = this._generationSelection;
        
        const prompt = `Please write the following technical core qualification document, based on the following prompt: ${docInfo.essayPrompt}
                      

${this.jobDescription ? `____
The TCQ you are writing is related to the following job description:
${this.jobDescription}` : ``}

____
The TCQ you are writing should be supported by this information in your background:
    Position: ${position.title.title} at ${position.organization.name}, from ${position.date.startDate} to ${position.date.present ? 'Present' : position.date.endDate}.
        
    Selected Activities:
    - ${selectedActivities.join('\n- ')}
        
    Selected Accomplishments:\n- ${selectedAccomplishments.join('\n- ')}
        
    ${(otherInfo ?
        `_____
Finally consider the following information: ${otherInfo} ` : '')}
________
When writing the TCQ, IT MUST BE NO MORE THAN ${length.toString()} WORDS. Feel free to add additional action-oriented steps that would logically have occured, even if not explicitly stated in the supporting information:
`;

        return prompt;
    }

    createParagraphPrompt(
        paragraphId: number,
        regenerationText: string,
        streamingTextArray: StreamingTextArray
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

        const prompt = `Consider the following in updating a technical core qualification document for a Senior Executive/Senior Leader position as describe here: ${docInfo.essayPrompt} ${docInfo.additionalDocInfo}
${this.jobDescription ? `____
The TCQ you are writing is related to the following job description:
${this.jobDescription}` : ``}
____

And the TCQ relies on the following position information, activities, and accomplishments:
    Position: ${position.title.title} at ${position.organization.name}, from ${position.date.startDate} to ${position.date.present ? 'Present' : position.date.endDate}.
        
    Selected Activities:
    - ${selectedActivities.join('\n- ')}
        
    Selected Accomplishments:\n- ${selectedAccomplishments.join('\n- ')}

        
Finally consider the following information: ${(otherInfo ? `${otherInfo}` : '')}
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

