// CoverLetterGenerator.ts
import { GenerationSelection } from "@/app/_types/GenerationSelection";
import { EssayGenerator } from "./EssayGenerator";
import { StreamingTextArray } from "@/app/_types/StreamingTextArray";

export class CoverLetterGenerator extends EssayGenerator {
  constructor(generationSelection: GenerationSelection) {
    super("cover_letter", generationSelection);
  }

  createPrompt(): string {
    const { docInfo, jobInfo, length, otherInfo, positions } = this._generationSelection;

    // Build a string describing all selected positions
    const positionsText = positions
      .map((posData, i) => {
        const p = posData.position;
        const activitiesText = posData.selectedActivities.join("\n- ");
        const accomplishmentsText = posData.selectedAccomplishments.join("\n- ");
        return `
[Position #${i + 1}]:
  ${p.title.title} at ${p.organization.name}
  Dates: ${p.date.startDate} - ${p.date.present ? "Present" : p.date.endDate}
  
  Selected Activities:
  - ${activitiesText}
  
  Selected Accomplishments:
  - ${accomplishmentsText}
        `;
      })
      .join("\n\n");

    // Example standard template letter
    const exampleLetter = `
[Your Name]
[Your Address]
[City, State ZIP]
${new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "long",
  day: "2-digit",
}).format(Date.now())}
[Recipient Name]
[Recipient Organization]
[Recipient Address]

Dear [recipient or to whom it may concern],


I am responding to your posting for a  position in the Department of Mechanical Engineering at University
of XXX. I graduated from the Department of Aeronautics and Astronautics at MIT in June with a doctorate, and am
currently working as a Postdoctoral Associate at MIT in the Department of Aeronautics and Astronautics. My thesis work
is in the area of active structural acoustic control using smart structures technology, and my specific research topic is the
development of a new wavenumber domain sensing method for active structural acoustic control. My thesis advisor is
Professor X in the Department of Aeronautics and Astronautics at MIT.

For my Ph.D. dissertation, I have worked on the development of the structural-acoustic control algorithms and their
implementation for the reduction of radiated noise from vibrating underwater vehicles. The Office of Naval Research,
with an objective of developing “smart” underwater vehicle systems so that the enemy cannot detect their attack in
advance, has funded this project. My responsibility in this project is to develop the new technology to reduce the radiated
noise from vibrating underwater vehicles. In order to accomplish this, I have developed a new wavenumber domain
sensing method and applied it to the real-time estimation of acoustic power and the design of feedback controller for
active structural acoustic control of the general complex structures. Furthermore, I have designed and experimentally
implemented local and global controller architectures with different configurations to find the best controller
configuration for the new underwater vehicle system.

I would like to continue my research on active structural control and active structural acoustic control for complex
systems, including aerospace systems (aircrafts, helicopters) and underwater vehicles (submarines, torpedoes). I will
carry out research on structure/fluid/control interaction phenomena and advanced sensor/actuator development using
smart structures technologies. Also, I will extend my research to the development of advanced control design techniques
for noise and vibration reduction of complex systems.

My ultimate research goal is to develop “intelligent structural systems”, which will contain arrays of sensors and
actuators, and embedded devices for controls and decision-making algorithms, so that those systems can coordinate
large numbers of devices and adapt themselves to uncertain environmental changes in an intelligent manner. I believe
my extensive research experience and specialization in structural dynamics and controls will allow me to continue my
research in those areas.

I have enclosed my curriculum vitae with a list of publications, and a list of references. If you have any questions or
would like to talk with me, I can be reached by phone at (XXX) XXX-XXXX or email at sample@gmail.com. Thank you for
your consideration. I look forward to hearing from you soon.

Sincerely,
Your Name
`.trim();

    const prompt = `
Please write a cover letter based on the following details${
      docInfo.additionalDocInfo
        ? ` and consider the following: ${docInfo.additionalDocInfo}`
        : ""
    }:

Example cover letter:
${exampleLetter}

________
The cover letter you're writing should support obtaining the following job:
${this.jobDescription}

________
Use the following positions as examples/experience (multiple positions may be mentioned):
${positionsText}

${
  otherInfo
    ? `
________
Finally, consider the following information:
${otherInfo}
`
    : ""
}

________
When writing the Cover Letter, **IT MUST BE NO MORE THAN ${length} WORDS**. 
Feel free to add any additional relevant or logical information to provide a more action-oriented letter. Only respond with the letter, DO NOT provide any other comments.
`;
    return prompt;
  }

  createParagraphPrompt(
    paragraphId: number,
    regenerationText: string,
    streamingTextArray: StreamingTextArray
  ): string {
    const { docInfo, otherInfo, positions } = this._generationSelection;

    // Same approach for multiple positions
    const positionsText = positions
      .map((posData, i) => {
        const p = posData.position;
        return `
[Position #${i + 1}]:
  ${p.title.title} at ${p.organization.name}
  (Dates: ${p.date.startDate} - ${p.date.present ? "Present" : p.date.endDate})
`;
      })
      .join("\n\n");

    const paragraphText =
      streamingTextArray.find((item) => item.id === paragraphId)?.text || "";

    if (!paragraphText) {
      throw new Error(`Error with paragraph text: ${paragraphText}`);
    }

    const prompt = `
Update a cover letter. 
${
  docInfo.additionalDocInfo
    ? `Incorporate the following: ${docInfo.additionalDocInfo}`
    : ""
}

The cover letter must reference the positions below:
${positionsText}

Any additional info:
${otherInfo ?? "(none)"}

---
Current cover letter so far:
${streamingTextArray.map((p) => p.text).join("\n")}

Rewrite **ONLY** the following paragraph:
${paragraphText}

Please rewrite it with these instructions. ONLY REWRITE THE PARAGRAPH. DO NOT INCLUDE OTHER COMMENTARY:
${regenerationText}
`;
    return prompt;
  }

  getDescription(): string {
    return `Cover letter`;
  }

  getFileNamePrefix(): string {
    return `Cover-Letter-`;
  }
}
