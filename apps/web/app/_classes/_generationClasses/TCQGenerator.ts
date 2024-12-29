// TCQGenerator.ts
import { EssayGenerator } from "./EssayGenerator";
import { StreamingTextArray } from "@/app/_types/StreamingTextArray";
import { GenerationSelection } from "@/app/_types/GenerationSelection";

export class TCQGenerator extends EssayGenerator {
  constructor(generationSelection: GenerationSelection) {
    super("tcq", generationSelection);
  }

  createPrompt(): string {
    const { docInfo, jobInfo, length, otherInfo, positions } = this._generationSelection;

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
The TCQ must be **NO MORE THAN ${length} WORDS**. 
Feel free to add action-oriented steps that logically might have occurred. DO NOT provide any other comments, only the text of the TCQ.
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
