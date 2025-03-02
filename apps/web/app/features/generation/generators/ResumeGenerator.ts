// File path: apps/web/app/features/generation/generators/ResumeGenerator.ts
import { GenerationSelection } from "@/app/features/generation/types/GenerationSelection";
import { EssayGenerator } from "./EssayGenerator";
import { StreamingTextArray } from "@/app/features/generation/types/StreamingTextArray";
import { Position } from "@fedjobs/types";

export class ResumeGenerator extends EssayGenerator {
  constructor(generationSelection: GenerationSelection) {
    super("resume", generationSelection);
  }

  createPrompt(): string {
    const { docInfo, jobInfo, length, lengthUnit, otherInfo, positions } = this._generationSelection;

    // Format the selected positions into a string the AI can use
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

    // Define sections expected in a resume
    const resumeSections = [
      "Contact Information",
      "Professional Summary",
      "Work Experience",
      "Skills",
      "Education",
      "Certifications (if applicable)",
    ].join(", ");

    // Build a prompt for generating a resume
    const lengthRequirement = this.formatLengthRequirementNOMORETHAN_X_WORDSorPAGES();
    const prompt = `
Create a professional resume based on the following information and positions:

${
  docInfo.additionalDocInfo
    ? `Consider these additional instructions: ${docInfo.additionalDocInfo}`
    : ""
}

${
  this.jobDescription
    ? `This resume should be tailored for the following job opportunity:
${this.jobDescription}`
    : ""
}

Professional History:
${positionsText}

${
  otherInfo
    ? `Other relevant information:
${otherInfo}`
    : ""
}

Your task:
1. Create a compelling professional resume that is ${lengthRequirement}
2. Include the following sections: ${resumeSections}
3. Format the resume with clean sections and bulleted lists for clarity
4. Emphasize skills and accomplishments relevant to the target position
5. Use action verbs and quantifiable achievements
6. Present the information in reverse chronological order
7. Be concise and impactful
8. DO NOT include personal information like age, marital status, or photo

Respond with only the formatted resume text.
`;

    return prompt;
  }

  createParagraphPrompt(
    paragraphId: number,
    regenerationText: string,
    streamingTextArray: StreamingTextArray
  ): string {
    const { docInfo, otherInfo, positions } = this._generationSelection;

    // Get information about available positions
    const positionsText = positions
      .map((posData) => `${posData.position.title.title} at ${posData.position.organization.name}`)
      .join("\n");

    // Get the specific paragraph to regenerate
    const paragraphText = 
      streamingTextArray.find((item) => item.id === paragraphId)?.text || "";

    if (!paragraphText) {
      throw new Error(`Error with paragraph text: ${paragraphText}`);
    }

    // Build a prompt for regenerating just one paragraph
    const prompt = `
You are helping improve a section of a professional resume.

${
  docInfo.additionalDocInfo
    ? `Resume context: ${docInfo.additionalDocInfo}`
    : ""
}

${
  this.jobDescription
    ? `Target job description:
${this.jobDescription}`
    : ""
}

Available positions:
${positionsText}

${
  otherInfo
    ? `Additional information:
${otherInfo}`
    : ""
}

Current resume:
${streamingTextArray.map((p) => p.text).join("\n")}

Rewrite ONLY this section:
${paragraphText}

Specific instructions for the rewrite:
${regenerationText}

IMPORTANT: Only provide the rewritten section text. Do not include any additional commentary.
`;

    return prompt;
  }

  getDescription(): string {
    return `Professional Resume`;
  }

  getFileNamePrefix(): string {
    return `Resume-`;
  }
}