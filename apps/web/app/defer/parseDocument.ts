// the `defer()` helper will be used to define a background function
import OpenAI from 'openai';
import { defer } from "@defer/client";
import { OpenAIStream, StreamingTextResponse } from 'ai';
import { db, eq } from "@/app/_db";
import { NewParsing, Parsing, parsings as parsingsTable } from '@/app/_db/schema/parsings';
import { getJSONFromAnnotatedResumeText } from '../_utils/resumeProcessor';
import { updateDocWithResumeJSON } from '../_actions/dbActions';
// a background function must be `async`

// Create an OpenAI API client (that's edge friendly!)
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY_35,
});

export type ParseDocumentResponse = {
    status: 'error',
    message: string
} | {
    status: 'ok',
    message: string
}
async function parseDocument(text: string, documentId: number, userId: string) {
    const prompt = `Please annotate the provided resume text by adding specific XML-style tags, ensuring that the original text is preserved exactly as it is, without any modifications, deletions, or summarizations. Each section describing a position should be enclosed within <position> and </position> tags. Within these, use <date startDate="mm/dd/yyyy" endDate="mm/dd/yyyy" present=boolean> tags for the dates of the position, <title title="Capitalized position title"> for the job title, <organization organization="Capitalized organization name"> for the organization name, and <details> for the full details of the position, including activities and accomplishments. Every distinct accomplishment within the <details> section should be individually wrapped in <accomplishment> tags. Each description of duties and assignments should be wrapped in a <activity> tag. If any text does not clearly fit into these categories, leave it untagged but ensure it remains unchanged. For example:
  
    <html> <position> <organization organization="Acme Inc.">ACME INC. for Leaders and Champions</organization> <title title="Fellow">Annual Fellow Selected through a Competitive Application</title> <date startDate="10/01/1991" endDate="11/1/1995" current=false>October, 1991 - November 1995</date> <details> <activity>Job description and responsibilities.<activity> <accomplishment>Specific accomplishment 1.</accomplishment> <accomplishment>Specific accomplishment 2.</accomplishment> Miscellaneous other text </details> </position> </html> Please follow this structure for the entire resume, maintaining the integrity of the original text.Provide only the output and complete the ENTIRE document. The text to parse is: ${text}
    `
    const temperature = 0.0;
    const newParsing: NewParsing = {
        userId: userId,
        type: "resume",
        prompt: prompt,
        completion: '',
        documentId: documentId,
        analysisPercent: 0,
        isComplete: false,
        temperature: temperature.toString()
    };
    const parsings = await db
        .insert(parsingsTable)
        .values(newParsing).returning();
    let parsing: Parsing
    if (parsings.length > 0) {
        parsing = parsings[0];
    } else {
        console.error('Inability to get parsings from database after inserting new one')
        return;
    }


    // Ask OpenAI for a streaming completion given the prompt
    const response = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        temperature: temperature,
        max_tokens: 4096,
        stream: true,
        messages: [
            {
                role: 'user',
                content: prompt
            },
        ],
    });
    const expectedAnnotationLength = text.length;
    let combinedOutput = ''; // Variable to store the combined output
    let iterationCount = 0; // Counter to track iterations

    // Convert the response into a friendly text-stream
    const stream = OpenAIStream(response, {
        onToken: async (token: string) => {
            combinedOutput += token;
            iterationCount++
            console.log(`Token received: "${token}", Iteration count: ${iterationCount}`);
            if (iterationCount % 50 === 0) {
                console.log(`combined output: ${combinedOutput}`);
                let progressPercentage = Math.round((combinedOutput.length / expectedAnnotationLength) * 85);
                progressPercentage = Math.min(progressPercentage, 99);
                db
                .update(parsingsTable)
                .set({
                    analysisPercent: progressPercentage
                })
            }

        },
        onCompletion: async (completion: string) => {
            console.log(`Stream completed. Total iterations: ${iterationCount}`);
            db
                .update(parsingsTable)
                .set({
                    completion: completion,
                    analysisPercent: 100,
                    isComplete: true
                })
                .where(eq(parsingsTable.id, parsing.id))
            const json = await getJSONFromAnnotatedResumeText(combinedOutput);
            if (!json) return;
                console.debug('annotatedResumeJson', json);

            await updateDocWithResumeJSON(documentId, json);
        }
    });


}

export default parseDocument;
