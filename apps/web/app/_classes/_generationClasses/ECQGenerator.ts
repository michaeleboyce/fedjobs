import { Position, PositionObject } from '../Position';
import { EssayGenerator } from './EssayGenerator';
import { ECQCompetency, ECQNamesType } from '@/app/_types/ECQCompetencies';
import { ECQ_COMPENTENCIES } from '@/app/_utils/Constants';
import { JobInfo } from '@/app/_types/JobInfo';
import { StreamingTextArray } from '@/app/_types/StreamingTextArray';
import { GenerationSelection } from '@/app/_types/GenerationSelection';


export class ECQGenerator extends EssayGenerator {
    ecq: ECQCompetency;

    constructor(ecqShortTitle: string, generationSelection: GenerationSelection) {
        super('ecq', generationSelection);
        const ecqResult = ECQ_COMPENTENCIES.find(ecq_c => ecqShortTitle.toLowerCase() === ecq_c.shortTitle.toLowerCase());
        if (!ecqResult)
            throw new Error(`Cannot generate an ECQ Essay, receive a bad ECQ Name: ${ecqShortTitle}`);
        this.ecq = ecqResult;
    }

    private generatedText: string | null = null;

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
        
        const prompt = `Please write an Executive Core Qualification (ECQ) narrative based on the following details:
        
Remember that the ECQ should follow a Challenge, Context, Action, Result format but not lable such sections explicitly, it should just be evident from the narrative structure of the text. 
                
You should use the following essay as an example:
        ${this.ecq.essays.join('\n  ---  \n')}
____
The ECQ you are writing should support obtaining the following job:
${this.jobDescription}
____
The ECQ MUST RELATE TO THE CATEGORY: ${this.ecq.shortTitle.toUpperCase()}

${!docInfo.additionalDocInfo? '':
`Additionally, consider the following when creating the ECQ: ${docInfo.additionalDocInfo}`}

Additionally, in generating the ECQ, you MUST make sure that the narrative includes the following competencies in that category. However, YOU MUST NOT SIMPLY LIST OUT EACH ONE, INSTEAD, PLEASE WEAVE THE CATEGORIES INTO THE NARRATIVE IN THE CCAR FORMAT, WITHOUT TOO OBVIOUSLY CALLING OUT EACH ONE. TO THE EXTENT POSSIBLE, DEMONSTRATE EACH TO AN ACTION OR RESULT ACHIEVED. 
${this.ecq.attributes.reduce((prev, curr) => {
            return prev + `${curr.title}: ${curr.description}`
        }, '')}

____
Base the ECQ off the following accomplishment:
    Position: ${position.title.title} at ${position.organization.name}, from ${position.date.startDate} to ${position.date.present ? 'Present' : position.date.endDate}.
        
    Selected Activities:
    - ${selectedActivities.join('\n- ')}
        
    Selected Accomplishments:\n- ${selectedAccomplishments.join('\n- ')}
        
    ${(otherInfo ?
        `_____
Finally consider the following information: ${otherInfo} ` : '')}

________
Write the ECQ narrative, IT MUST BE NO MORE THAN ${length.toString()} WORDS. Feel free to add additional natural actions that likely occurred to provide a more action-oriented essay. Each accomplishment should be clear, concise, and emphasize your level of responsibilities; the scope and complexity of the programs, activities, or services you managed; program accomplishments; policy initiatives undertaken; level of contacts; the sensitivity and criticality of the issues you addressed; and the results of your actions. You should use action-oriented leadership words to describe your experience and accomplishments (e.g., Led the development and implementation of....) and quantify your experience wherever possible to demonstrate your accomplishments (e.g., number of employees supervised; size of budget managed; amount of money saved, etc.).:
`;

        return prompt;
    }

    createParagraphPrompt(
        paragraphId: number,
        regenerationText: string,
        streamingTextArray: StreamingTextArray): string {
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

        const prompt = `Consider the following in updating an ECQ essay on :${this.ecq.shortTitle}${!docInfo.additionalDocInfo ? '' :
    `And considering the following information: ${docInfo.additionalDocInfo}`}:
        ____
The ECQ should support getting the job:
${this.jobDescription}
____

And the ECQ relies on the following accomplishments:
    Position: ${position.title.title} at ${position.organization.name}, from ${position.date.startDate} to ${position.date.present ? 'Present' : position.date.endDate}.
        
    Selected Activities:
    - ${selectedActivities.join('\n- ')}
        
    Selected Accomplishments:\n- ${selectedAccomplishments.join('\n- ')}

    ${(otherInfo ?
        `_____
Finally consider the following information: ${otherInfo} ` : '')}

_____
Given that this is the current essay:
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
        return `Executive Core Qualifications (ECQ) Narrative for ECQ: ${this.ecq.shortTitle}`;
    }

    getFileNamePrefix(): string {
        return `ECQ-${this.ecq.shortTitle}-`;
    }


}

