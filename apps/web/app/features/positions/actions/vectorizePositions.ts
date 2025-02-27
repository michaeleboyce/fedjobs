// File path: apps/web/app/_actions/vectorize/vectorizePositions.ts

import { Resume, Position } from "@fedjobs/types";
import { voyage } from 'voyage-ai-provider';
import { Pinecone } from '@pinecone-database/pinecone';
import { embedMany } from 'ai';

const embeddingModel = voyage.textEmbeddingModel('voyage-3');
const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY || '' });

export interface EmbeddingResult {
    content: Position;
    embedding: number[];
}

export interface PineconeRecord {
    id: string;
    values: number[];
    metadata: {
        filename: string;
        userId: string;
        content: string;
    };
}


export async function generatePositionEmbeddings(data: string[]): Promise<EmbeddingResult[]> {
    const { embeddings } = await embedMany({
        model: embeddingModel,
        values: data
    });

    return data.map((_, i) => ({
        content: JSON.parse(data[i]),
        embedding: embeddings[i]
    }));
}

export function createPineconeRecords(
    data: string[],
    embeddings: EmbeddingResult[],
    filename: string,
    userId: string
): PineconeRecord[] {
    return data.map((d, i) => ({
        id: `position-${i.toString()}-${filename}`,
        values: embeddings[i].embedding,
        metadata: {
            filename,
            userId,
            content: d
        }
    }));
}

export async function vectorizePositions(resume: Resume, userId: string) {
    const positionData = resume.positions.map(p => JSON.stringify(p));
    const finalEmbeddings = await generatePositionEmbeddings(positionData);
    const records = createPineconeRecords(positionData, finalEmbeddings, resume.filename, userId);

    const index = pc.index('fedjobs');
    await index.upsert(records);
}