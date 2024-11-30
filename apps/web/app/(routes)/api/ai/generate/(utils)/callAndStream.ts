import { db } from "@/app/_db";
import { generations as generationsTable } from '@/app/_db/schema/generations';
import { GENERATION_TYPES } from "@/app/_utils/Constants";

import { OpenAIStream, StreamingTextResponse } from "ai";
import OpenAI from "openai";
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY_35,
  });

export const callAndStreamAIResponse = async (prompt: string, userId: string, type: string, isParagraph: boolean, temperature: number, max_tokens: number, model: string = 'gpt-4-turbo-preview') => {
    const response = await openai.chat.completions.create({
        model: model,
        temperature: temperature,
        max_tokens: max_tokens,
        stream: true,
        messages: [
        {
            role: 'user',
            content: prompt
        },
        ],
    });
    
    // Convert the response into a friendly text-stream
    const stream = OpenAIStream(response, {
        onCompletion: async (completion: string) => {
            await db
                .insert(generationsTable)
                .values({
                    promp: prompt,
                    type: type,
                    isParagraph: isParagraph,
                    userId: userId,
                    completion: completion,
                    temperature: temperature.toString()
                });
        }
    });    
    // Respond with the stream
    return new StreamingTextResponse(stream);
    }