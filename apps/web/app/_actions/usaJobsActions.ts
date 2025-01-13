// File path: apps/web/app/_actions/usaJobsActions.ts
'use server'
import { Job } from "@fedjobs/types";

import OpenAI from 'openai';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';

// Define the structure of a SearchResultItem (if it's different from Job)

export async function searchUSAJobsAPI(query: string): Promise<Job[]> {
    try {
    const response =await fetch(`https://data.usajobs.gov/api/Search?Keyword=${query}&ResultsPerPage=10`, {
            headers: {
            'Host': 'data.usajobs.gov',
            'User-Agent': process.env.USAJOBS_EMAIL!,
            'Authorization-Key': process.env.USAJOBS_API_KEY!
            }
        })
    const resultJson = await response.json();
    const fetchedJobs: Job[] = resultJson.SearchResult.SearchResultItems;
    return fetchedJobs;
    } catch (e: any){
        if (e instanceof Error){
            console.error(e);
        }
        throw e;
    }
};

// Create an OpenAI API client (that's edge friendly!)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY_35,
});
 
// IMPORTANT! Set the runtime to edge
 
export async function getTCQEssayPrompts(evaluations: string): Promise<string[]>  {
  // Extract the `prompt` from the body of the request
  const { isAuthenticated } = await getKindeServerSession();
  if (!(await isAuthenticated())) return [];
  const prompt =`consider this section of a job posting: ${evaluations}
  ____
  Returning on JSON output in the format:
    ["TCQ text #1","TCQ text #2",...]
  Return all strings of Technical core qualification prompts required in the position and provide their prompts back as a JSON string array. Only provide it is an arrray of comma delinated strings, do not wrap it in any other JSON. If you did not find any TCQ prompts, return the empty array '[]' Do not feel the need to return TCQ prompts if there are none.`;
  // Ask OpenAI for a streaming completion given the prompt
  const response = await openai.completions.create({
    model: "gpt-4o",
    temperature: 0.0,
    max_tokens: 2048,
    prompt
  });
  const parsedJSON: string[] =  JSON.parse(response.choices[0].text!);
  return parsedJSON;
}
