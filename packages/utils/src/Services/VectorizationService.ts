// File path: packages/utils/src/Services/VectorizationService.ts
import dotenv from 'dotenv';
dotenv.config();

import { Resume, Position } from "@fedjobs/types";
import { voyage } from 'voyage-ai-provider';
import { Pinecone } from '@pinecone-database/pinecone';
import { embedMany } from 'ai';


const embeddingModel = voyage.textEmbeddingModel('voyage-3');
let pc: Pinecone;

function getPineconeClient() {
  if (!pc) {
    if (!process.env.PINECONE_API_KEY) {
      throw new Error('PINECONE_API_KEY environment variable is not set');
    }
    pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  }
  return pc;
}

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
    values: data,
  });

  return data.map((_, i) => ({
    content: JSON.parse(data[i]),
    embedding: embeddings[i],
  }));
}

export function createPineconeRecords(
  embeddings: EmbeddingResult[],
  filename: string,
  docId: string,
  userId: string,
  type: string
): PineconeRecord[] {
  return embeddings.map((embeddingResult) => {
    const position: Position = embeddingResult.content;
    return {
      id: `${docId}#${position.positionUuid}`, // Use the unique UUID
      values: embeddingResult.embedding,
      metadata: {
        filename,
        userId,
        content: JSON.stringify(position),
        type
      },
    };
  });
}

/**
 * Vectorizes multiple positions
 * @param resume - The resume containing positions
 * @param userId - The user ID
 */
export async function vectorizePositions(resume: Resume,  docId: string, userId: string, indexName = 'fedjobs') {
  const positionData = resume.positions.map((p) => JSON.stringify(p));
  const finalEmbeddings = await generatePositionEmbeddings(positionData);
  const records = createPineconeRecords(finalEmbeddings, resume.filename, docId, userId, 'position');

  const index = getPineconeClient().index(indexName);
  await index.upsert(records);
}

/**
 * Vectorizes a single position
 * @param position - The position to vectorize
 * @param filename - The filename associated with the position
 * @param userId - The user ID
 */
export async function vectorizePosition(position: Position, filename: string, docId: string, userId: string, indexName = 'fedjobs') {
  const positionData = JSON.stringify(position);
  const finalEmbeddings = await generatePositionEmbeddings([positionData]);
  const records = createPineconeRecords(finalEmbeddings, filename, docId, userId, 'position');

  const index = getPineconeClient().index(indexName);
  await index.upsert(records);
}

/**
 * Deletes the vectorized positions by their docId prefix
 * @param docId - The document ID
 */
export async function deleteVectorizedPositions(docId: string, indexName = 'fedjobs') {
  const index = getPineconeClient().index(indexName);
  let results = await index.listPaginated({ prefix: docId });
  while (results.pagination?.next && results.vectors && results.vectors.length > 0) {
    await index.deleteMany(results.vectors?.map(v => v.id));
    results = await index.listPaginated({ prefix: docId, paginationToken: results.pagination.next });
  }
  if (results.vectors && results.vectors.length > 0)
  await index.deleteMany(results.vectors?.map(v => v.id));
}