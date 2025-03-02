// File path: apps/web/app/features/generation/generators/OtherGenerator.ts
// OtherGenerator.ts
import { GenerationSelection } from "@/app/features/generation/types/GenerationSelection";
import { EssayGenerator } from "./EssayGenerator";
import { StreamingTextArray } from "@/app/features/generation/types/StreamingTextArray";

export class OtherGenerator extends EssayGenerator {
  constructor(generationSelection: GenerationSelection) {
    super("cover_letter", generationSelection);
  }

  createPrompt(): string {
    const { docInfo, jobInfo, length, lengthUnit, otherInfo, positions } = this._generationSelection;

    // Build text for multiple positions
    const positionsText = positions
      .map((posData, i) => {
        const p = posData.position;
        const activities = posData.selectedActivities.join("\n- ");
        const accomplishments = posData.selectedAccomplishments.join("\n- ");
        return `
[Position #${i + 1}]:
  ${p.title.title} at ${p.organization.name} 
  (Dates: ${p.date.startDate} - ${p.date.present ? "Present" : p.date.endDate})

  Selected Activities:
  - ${activities}

  Selected Accomplishments:
  - ${accomplishments}
        `;
      })
      .join("\n\n");
    const lengthRequirement = this.formatLengthRequirementNOMORETHAN_X_WORDSorPAGES();

    const prompt = `
Please write the following “other” type document as described below: 
${docInfo.additionalDocInfo ?? "(No additional doc info provided)"}

${this.jobDescription
        ? `
The document is related to the following job description:
${this.jobDescription}
`
        : ""
      }

Use these positions as references/experience:
${positionsText}

${otherInfo
        ? `
Finally, consider the following extra info:
${otherInfo}
`
        : ""
      }

________
The document must be **${lengthRequirement}**. Provide only the text of the document.
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
      .map((posData, i) => {
        const p = posData.position;
        return `[Position #${i + 1}] ${p.title.title} at ${p.organization.name}`;
      })
      .join("\n");

    const paragraphText =
      streamingTextArray.find((item) => item.id === paragraphId)?.text ?? "";

    if (!paragraphText) {
      throw new Error(`Error with paragraph text: ${paragraphText}`);
    }

    const prompt = `
Consider the following in updating this document: 
${docInfo.additionalDocInfo ?? "(none)"}

${this.jobDescription
        ? `Job description context:\n${this.jobDescription}`
        : ""
      }

Positions used as examples:
${positionsText}

Additional info:
${otherInfo ?? "(none)"}

---
Current document text:
${streamingTextArray.reduce((prev, curr) => prev + curr.text + "\n", "")}

Rewrite **ONLY** this paragraph:
${paragraphText}

And you MUST apply these instructions. ONLY REWRITE THE PARAGRAPH. DO NOT INCLUDE OTHER COMMENTARY:
${regenerationText}
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
