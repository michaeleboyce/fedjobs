'use server'
import { inngest } from "./client";

export async function buildResumeJSON(content: string, documentId: number){
    return await inngest.send({
        name: 'fedjobs/buildResumeJSON',
        data: {
          content,
          documentId
        },
      });

}