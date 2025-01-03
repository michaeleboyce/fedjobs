// File path: apps/web/app/_classes/_generationClasses/TCQGenerator.ts
// TCQGenerator.ts
import { EssayGenerator } from "./EssayGenerator";
import { StreamingTextArray } from "@/app/_types/StreamingTextArray";
import { GenerationSelection } from "@/app/_types/GenerationSelection";

export class TCQGenerator extends EssayGenerator {
  constructor(generationSelection: GenerationSelection) {
    super("tcq", generationSelection);
  }

  createPrompt(): string {
    const { docInfo, jobInfo, length, lengthUnit, otherInfo, positions } = this._generationSelection;

    const positionsText = positions
      .map((posData, i) => {
        const p = posData.position;
        const activities = posData.selectedActivities.join("\n- ");
        const accomplishments = posData.selectedAccomplishments.join("\n- ");
        return `
[Position #${i + 1}]:
  ${p.title.title} at ${p.organization.name}
  Dates: ${p.date.startDate} - ${p.date.present ? "Present" : p.date.endDate}

  Selected Activities:
  - ${activities}

  Selected Accomplishments:
  - ${accomplishments}
        `;
      })
      .join("\n\n");

    const lengthRequirement = this.formatLengthRequirementNOMORETHAN_X_WORDSorPAGES();
    const prompt = `
Please write a Technical Core Qualification (TCQ) document based on the following prompt:
${docInfo.essayPrompt}

${
  this.jobDescription
    ? `The TCQ is related to the following job:
${this.jobDescription}`
    : ""
}

The TCQ you are writing should be supported by this information in your background:
${positionsText}

${
  otherInfo
    ? `Finally, consider the following extra information:
${otherInfo}`
    : ""
}

________
The TCQ must be **${lengthRequirement}**. 
Feel free to add action-oriented steps that logically might have occurred. Given the positions, determine if you want to provide 1-2 examples in the challenge-context-action-result format, or discuss more examples. In either case, your document should have a clear but brief opening and conclusion and show flow clearly from one paragraph to the next. Write directly, objectively, avoid using flowering words. Show don't tell. DO NOT provide any other comments, only the text of the TCQ.
`;

    return prompt;
  }

  createParagraphPrompt(
    paragraphId: number,
    regenerationText: string,
    streamingTextArray: StreamingTextArray
  ): string {
    const { docInfo, otherInfo, positions } = this._generationSelection;

    const positionsText = positions
      .map((posData) => `${posData.position.title.title} at ${posData.position.organization.name}`)
      .join("\n");

    const paragraphText =
      streamingTextArray.find((item) => item.id === paragraphId)?.text ?? "";

    if (!paragraphText) {
      throw new Error(`Error with paragraph text: ${paragraphText}`);
    }

    const prompt = `
 Consider the following in updating a technical core qualification document for a Senior Executive/Senior Leader position as describe here: ${docInfo.essayPrompt}

Additional info: ${docInfo.additionalDocInfo ?? "(none)"}

${
  this.jobDescription
    ? `Job context:
${this.jobDescription}`
    : ""
}

Positions used:
${positionsText}

Other info:
${otherInfo ?? "(none)"}

---
Current TCQ text:
${streamingTextArray.reduce((prev, curr) => prev + curr.text + "\n", "")}

Rewrite ONLY the following paragraph:
${paragraphText}

And you MUST apply these instructions. ONLY REWRITE THE PARAGRAPH. DO NOT INCLUDE OTHER COMMENTARY:
${regenerationText}
`;

    return prompt;
  }

  getDescription(): string {
    return `TCQ Document`;
  }

  getFileNamePrefix(): string {
    return `TCQ-Document-`;
  }
}
