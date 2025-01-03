// File path: apps/web/app/_classes/_generationClasses/ECQGenerator.ts
// ECQGenerator.ts
import { PositionObject } from "../Position";
import { EssayGenerator } from "./EssayGenerator";
import { ECQCompetency } from "@/app/_types/ECQCompetencies";
import { ECQ_COMPENTENCIES } from "@/app/_utils/Constants";
import { JobInfo } from "@fedjobs/types";
import { StreamingTextArray } from "@/app/_types/StreamingTextArray";
import { GenerationSelection } from "@/app/_types/GenerationSelection";

export class ECQGenerator extends EssayGenerator {
  ecq: ECQCompetency;

  constructor(ecqShortTitle: string, generationSelection: GenerationSelection) {
    super("ecq", generationSelection);
    const ecqResult = ECQ_COMPENTENCIES.find(
      (ecq_c) => ecqShortTitle.toLowerCase() === ecq_c.shortTitle.toLowerCase()
    );
    if (!ecqResult) {
      throw new Error(
        `Cannot generate an ECQ Essay, received a bad ECQ Name: ${ecqShortTitle}`
      );
    }
    this.ecq = ecqResult;
  }

  private generatedText: string | null = null;

  /**
   * Creates the main prompt for OpenAI
   */
  createPrompt(): string {
    const { docInfo, jobInfo, length, lengthUnit, otherInfo, positions } = this._generationSelection;

    // Build a string describing all user-selected positions
    const positionsText = positions
      .map((posData, i) => {
        const pos = posData.position;
        // If you stored numeric indexes, you'd map them to real text here.
        // If you already have strings, skip that step.
        const selectedActivities = posData.selectedActivities;
        const selectedAccomplishments = posData.selectedAccomplishments;

        // Construct text lines or bullet points:
        const activitiesList = selectedActivities.join("\n- ");
        const accomplishmentsList = selectedAccomplishments.join("\n- ");

        return `
Position #${i + 1}: ${pos.title.title} at ${pos.organization.name}, 
  Date Range: ${pos.date.startDate} - ${pos.date.present ? "Present" : pos.date.endDate}

  Selected Activities:
  - ${activitiesList}

  Selected Accomplishments:
  - ${accomplishmentsList}
        `;
      })
      .join("\n\n");

    const lengthRequirement = this.formatLengthRequirementNOMORETHAN_X_WORDSorPAGES();

    // Build the final prompt string
    const prompt = `
Please write an Executive Core Qualification (ECQ) narrative based on the following details:

Remember that the ECQ should follow a Challenge, Context, Action, Result (CCAR) format — but do not label sections explicitly. 

Use the following essay as an example:
${this.ecq.essays.join("\n  ---  \n")}

---
The ECQ you're writing should support obtaining the following job:
${this.jobDescription}

---
The ECQ MUST RELATE TO THE CATEGORY: ${this.ecq.shortTitle.toUpperCase()}

${docInfo.additionalDocInfo
        ? `Additionally, consider:\n${docInfo.additionalDocInfo}`
        : ""
      }

In generating this ECQ, you MUST weave in the competencies below, but do NOT just list them. Incorporate them in a narrative style:
${this.ecq.attributes
        .map((attr) => `${attr.title}: ${attr.description}`)
        .join("\n")}

---
Base the ECQ on the following positions/accomplishments:
${positionsText}

${otherInfo
        ? `
---
Finally consider the following additional information:
${otherInfo}
`
        : ""
      }

---
YOUR TASK:
Write the ECQ narrative in ${lengthRequirement}. Be action-oriented and concise, quantifying achievements where possible. Provide only the final essay text with no extra commentary.
`;

    return prompt;
  }

  /**
   * Used when regenerating a specific paragraph (if you have partial editing)
   */
  createParagraphPrompt(
    paragraphId: number,
    regenerationText: string,
    streamingTextArray: StreamingTextArray
  ): string {
    // The logic is similar: we read all positions from _generationSelection, build a partial prompt
    const { docInfo, positions, otherInfo } = this._generationSelection;
    const paragraphText =
      streamingTextArray.find((item) => item.id === paragraphId)?.text || "";

    const prompt = `Consider the following in updating an ECQ essay on ${this.ecq.shortTitle}:
  
The essay supports getting the job:
${this.jobDescription}

It must incorporate:
${positions
        .map((posData) => {
          const p = posData.position;
          return `${p.title.title} at ${p.organization.name}`;
        })
        .join("\n")}
  
Additional info:
${docInfo.additionalDocInfo
        ? docInfo.additionalDocInfo
        : "(No additional doc info)"
      }

${otherInfo ? `Other user info: ${otherInfo}` : ""}

---
Current essay so far:
${streamingTextArray.map((item) => item.text).join("\n")}

You must rewrite ONLY the following paragraph:
${paragraphText}

And you MUST apply these instructions. ONLY REWRITE THE PARAGRAPH. DO NOT INCLUDE OTHER COMMENTARY:
${regenerationText}
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
