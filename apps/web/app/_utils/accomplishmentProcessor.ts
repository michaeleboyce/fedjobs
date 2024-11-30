import { OpenAI } from 'openai';


type DateInfo = {
  primaryDate: string;
  startDate: string;
  endDate: string;
  approximate: boolean;
};

type Source = {
  docName: string;
  text: string;
};

type Accomplishment = {
  key: string;
  name: string;
  position: string;
  employer: string;
  date: DateInfo;
  details: string;
  sources: Source[];
  userDescription: string;
};

type Accomplishments = Accomplishment[];

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY_35 || '' });

export async function updateAccomplishments(documents: string[], existingAccomplishments: Accomplishments): Promise<Accomplishments> {
  for (const doc of documents) {
    const prompt = generatePrompt(doc, existingAccomplishments);
    const response = await callGpt4Api(prompt);
    const newAccomplishments = parseApiResponse(response);
    mergeAccomplishments(existingAccomplishments, newAccomplishments);
  }
  return existingAccomplishments;
}

function generatePrompt(doc: string, existingAccomplishments: Accomplishments): string {
  let prompt = `Please process the job application document provided and extract all individual accomplishments. For each accomplishment, create a structured JSON object within an array. The document text is as follows:\n\n${doc}\n\n`;

  if (existingAccomplishments.length > 0) {
    prompt += "Existing accomplishments are as follows:\n";
    for (const accomplishment of existingAccomplishments) {
      prompt += JSON.stringify(accomplishment, null, 2) + "\n";
    }
  }

  prompt += "\nMake sure to identify each accomplishment related to education, international work, research, leadership, philanthropy, skills, and any other categories present in the text. Each accomplishment should be formatted into its own JSON object, and all such objects should be included in a single array. The required format for each JSON object is:\n";
  prompt += "\n" + JSON.stringify({
    accomplishments: [{
    key: "<Leave this field empty as it will be generated programmatically",
    name: "<name of the accomplishment>",
    position: "<title of the position held at time of accomplishment, if known,otherwise leave as empty string>",
    employer: "<company or organization where the accomplishment occurred, if known, otherwise leave as empty string>",
    date: {
      primaryDate: "<mm/dd/yyyy or empty string, use 1s where specific dates aren't known>",
      startDate: "<mm/dd/yyyy or empty string, use 1s where specific dates aren't known>",
      endDate: "<mm/dd/yyyy or empty string, use 1s where specific dates aren't known>",
      approximate: "<boolean value, should be true if months are not known from either the primary date or start and end date "
    },
    details: "<full details of the accomplishment, always add to this with additional information, never remove information>",
    sources: [{ docName: "<name of the source document, if known>", text: "<exact text from the document related to the accomplishment>" }],
    userDescription: "<user-provided description, not to be altered by the model but can be used for matching or context purposes>"
  }],
    additionalAccomplishments: "<boolean is true if there are additional accomplishments found in the document not yet added to the accomplishments array.>"
  },null, 2) 

  prompt += "\nIf no accomplishments are found, return accomplishments as an empty array, and additionalAccomplishments as false. As best as possible, ensure that every identified accomplishment is included, even if it means the array will contain multiple objects.";

  return prompt;
}

async function callGpt4Api(prompt: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-4-1106-preview",
    response_format: {"type":"json_object"},
    temperature: 1.0,
    max_tokens: 4096,
    messages:[{role: "user", content: prompt}] 
});
  const result = response.choices[0].message.content || '';
  console.log(`Result: ${result}`);
  return result;
}

function parseApiResponse(response: string): Accomplishments {
  try {
    const parsedResponse = JSON.parse(response);

    // Check if parsedResponse is an array
    if (Array.isArray(parsedResponse)) {
      for (const accomplishment of parsedResponse) {
        accomplishment.key = generateAccomplishmentKey(accomplishment);
      }
      return parsedResponse;
    } else if (typeof parsedResponse === 'object' && parsedResponse !== null) {
      // Handle the case where parsedResponse is a single object
      parsedResponse.key = generateAccomplishmentKey(parsedResponse);
      return [parsedResponse]; // Return it as an array with one element
    } else {
      // Not an object or an array
      console.error("Invalid response format");
      return [];
    }
  } catch (error) {
    console.error("Error parsing GPT-4 response:", error);
    return [];
  }
}

function generateAccomplishmentKey(accomplishment: Accomplishment): string {
  return `${accomplishment.name}-${accomplishment.position}-${accomplishment.employer}`;
}

function mergeAccomplishments(existing: Accomplishments, newAccomplishments: Accomplishments): void {
  newAccomplishments.forEach(newAcc => {
    const existingIndex = existing.findIndex(acc => acc.key === newAcc.key);
    if (existingIndex > -1) {
      // Update details and sources of the existing accomplishment
      existing[existingIndex].details += ` ${newAcc.details}`;
      existing[existingIndex].sources = [...existing[existingIndex].sources, ...newAcc.sources];
    } else {
      existing.push(newAcc);
    }
  });
}

