// File path: packages/utils/src/ServerActions/VectorizationActions.ts
'use server';
import dotenv from 'dotenv';
dotenv.config();

import { Resume, Position } from "@fedjobs/types";
import { Pinecone } from '@pinecone-database/pinecone';
import { GoogleGenerativeAI } from '@google/generative-ai';

let pc: Pinecone;

// Validate GEMINI_API_KEY
if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY environment variable is not set');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "text-embedding-004" });

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
    userId: string;
    content: string;
    type: string;
  };
}

export async function generatePositionEmbeddings(data: string[]): Promise<EmbeddingResult[]> {
  // Initiate all embedding promises
  const embeddingPromises = data.map(async (d) => {
    const result = await model.embedContent(d);
    const values: number[] = result.embedding.values;
    return values;
  });

  // Await all promises to resolve
  const embeddings = await Promise.all(embeddingPromises);

  // Construct EmbeddingResult array
  return data.map((d, i) => ({
    content: JSON.parse(d),
    embedding: embeddings[i],
  }));
}

interface CreatePineconeRecordsParams {
  embeddings: EmbeddingResult[];
  docId: string;
  userId: string;
  type: string;
}

function createPineconeRecords({
  embeddings,
  docId,
  userId,
  type,
}: CreatePineconeRecordsParams): PineconeRecord[] {
  return embeddings.map((embeddingResult) => {
    const position: Position = embeddingResult.content;
    return {
      id: `${docId}#${position.positionUuid}`, // Use the unique UUID
      values: embeddingResult.embedding,
      metadata: {
        userId,
        content: JSON.stringify(position),
        type,
      },
    };
  });
}

/**
 * Vectorizes multiple positions
 * @param resume - The resume containing positions
 * @param userId - The user ID
 * @param docId - the ID of the associated document. Default to "0" if no associated document
 * @param indexName - the name of the index. Default to "fedjobs" can set it in testing though when using a different index
 */
export async function vectorizePositions(
  resume: Resume,
  userId: string,
  docId: string = "0",
  indexName = 'fedjobs'
) {
  const positionData = resume.positions.map((p) => JSON.stringify(p));
  const finalEmbeddings = await generatePositionEmbeddings(positionData);
  const records = createPineconeRecords({
    embeddings: finalEmbeddings,
    docId,
    userId,
    type: 'position',
  });

  const index = getPineconeClient().index(indexName);
  await index.upsert(records);
}

/**
 * Vectorizes a single position
 * @param position - The position to vectorize
 * @param userId - The user ID
 * @param docId - the ID of the associated document. Default to "0" if no associated document
 * @param indexName - the name of the index. Default to "fedjobs" can set it in testing though when using a different index
 */
export async function vectorizePosition(
  position: Position,
  userId: string,
  docId: string = "0",
  indexName = 'fedjobs'
) {
  const positionData = JSON.stringify(position);
  const finalEmbeddings = await generatePositionEmbeddings([positionData]);
  const records = createPineconeRecords({
    embeddings: finalEmbeddings,
    docId,
    userId,
    type: 'position',
  });

  const index = getPineconeClient().index(indexName);
  await index.upsert(records);
}

/**
 * Queries Pinecone for similar positions based on the given position's embedding.
 * @param positionUuid - The UUID of the position to query similarities for.
 * @returns Array of similar position UUIDs with similarity scores above the threshold.
 */
export async function querySimilarPositions(docId: string, positionUuid: string, threshold: number = 0.9, indexName = 'fedjobs'): Promise<{ id: string; score: number }[]> {
  const pinecone = getPineconeClient();
  const index = pinecone.index(indexName);

  const queryResponse = await index.query({
    id: `${docId}#${positionUuid}`,
    topK: 10,
    includeValues: true,
  });

  // Filter matches based on the threshold and undefined scores
  const filteredMatches = queryResponse.matches
    .filter((match) => 
      typeof match.score === 'number' && match.score > threshold
    )
    .map(match => ({
      id: match.id,
      score: match.score!
    }));

  return filteredMatches;
}
/**
 * Deletes the vectorized positions by their docId prefix
 * @param docId - The document ID
 * @param indexName - the name of the index. Default to "fedjobs" can set it in testing though when using a different index
 */
export async function deleteVectorizedPositions(docId: string, indexName = 'fedjobs') {
  const index = getPineconeClient().index(indexName);
  let results = await index.listPaginated({ prefix: docId });
  while (results.pagination?.next && results.vectors && results.vectors.length > 0) {
    await index.deleteMany(results.vectors.map(v => v.id));
    results = await index.listPaginated({ prefix: docId, paginationToken: results.pagination.next });
  }
  if (results.vectors && results.vectors.length > 0)
    await index.deleteMany(results.vectors.map(v => v.id));
}
