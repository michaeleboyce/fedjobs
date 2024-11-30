'use server'

import { OpenAI } from 'openai';
import { Resume, ResumeObject } from '../_classes/Resume';

//export const runtime = 'edge';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY_35 || '' });

export async function getJSONFromAnnotatedResumeText(annotatedText: string): Promise<ResumeObject> {
    const resume = Resume.fromText(annotatedText);
    // If Resume.fromText or resume.toJSON are actually async, you would await them:
    // const resume = await Resume.fromText(annotatedText);
    // return await resume.toJSON();

    return resume.toJSON();
}