// File path: apps/web/app/_actions/vectorize/vectorizeActions.ts
'use server'
import { PINECONE_INDEX_NAME } from '@/app/shared/utils/Constants';
import { Pinecone } from '@pinecone-database/pinecone';

type IndexMetaData = {
  docName: string,
  text: string
}

interface Embedding {
  object: string;
  embedding: number[];
  index: number;
}

interface Data {
  object: string;
  data: Embedding[];
}
interface Vector {
  id: string;
}

interface VectorListResponse {
  vectors: Vector[];
  pagination: {
    next: string;
  };
  namespace: string;
  usage: {
    readUnits: number;
  };
}

const apiKey = process.env.PINECONE_API_KEY!;
const indexHost = process.env.PINECONE_HOST!;

const pinecone = new Pinecone({
  apiKey
});

export async function vectorizeDocument(documentText: string, docName: string, docId: number, docType: string, userId: string) {
    const voyageApiKey = process.env.VOYAGE_API_KEY!;
    const paragraphs = documentText.split(/\n\n+/);
    const batchSize = 128;
    const index = pinecone.index<IndexMetaData>(PINECONE_INDEX_NAME);
  
    const processedParagraphs = paragraphs.flatMap(paragraph => {
      const wordCount = paragraph.split(' ').length;
      // Use processLongParagraphs for paragraphs exceeding 150 words
      return wordCount > 150 ? processLongParagraphs(paragraph) : [paragraph];
    });

    for (let i = 0; i < processedParagraphs.length; i += batchSize) {
      const batch = processedParagraphs.slice(i, i + batchSize);
      const embeddings = await getEmbeddings(batch, voyageApiKey);
  
      if (embeddings.length > 0) {
        await checkOrCreateIndex(PINECONE_INDEX_NAME, embeddings[0].embedding.length);
      }
  
      const toUpsert = embeddings.map((emb, index) => ({
        id: `${docId}#${i}#${index}`,
        values: emb.embedding,
        metadata: { docName, docType, docId, userId, text: batch[index] }
      }));
      await index.upsert(toUpsert);
    }
    //findRelevantSentences("2.  Demonstrated leadership and results from utilizing multi-year planning, strategic thinking, process re-engineering, organizational streamlining, and partnering with non-technology leaders to improve operations and customer service.", userId)
    return { status: 'ok' };
  }
  import fetch from 'node-fetch';

  // Function to get the list of vectors
  export async function getVectorList(prefix: string): Promise<string[]> {
  // Replace with your actual API key
    const url = `${indexHost}/vectors/list?prefix=${prefix}#`;
  
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Api-Key': apiKey
      }
    });
  
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  
    const data: VectorListResponse = await response.json();
    return data.vectors.map(vector => vector.id);
  }
  
  // Function to delete a list of documents based on their IDs
  export async function deleteDocuments(ids: string[]): Promise<void> {
    const url = `${indexHost}/vectors/delete`;
  
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Api-Key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ids })
    });
  
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }
  
  // Super function to retrieve and delete documents
  export async function retrieveAndDeleteDocuments(prefix: string): Promise<void> {
    try {
      const ids = await getVectorList(prefix);
      if (ids.length > 0) {
        await deleteDocuments(ids);
        console.log('Documents deleted successfully');
      } else {
        console.log('No documents found for the given prefix');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }
  
// Check and create Pinecone index
async function checkOrCreateIndex(indexName: string, dimension: number) {
    const indexes = await pinecone.listIndexes();
    if (!indexes.indexes?.some(index => index.name == indexName)) {
      await pinecone.createIndex({
        name: 'fedjobs',
        dimension: 1024,
        metric: 'cosine',
        spec: {
          serverless: {
            cloud: 'aws',
            region: process.env.PINECONE_REGION!
          }
        }
      });
    }
  }


async function getEmbeddings(sentences: string[], apiKey: string): Promise<Embedding[]> {
    try {
      const response = await fetch('https://api.voyageai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({ input: sentences, model: 'voyage-2' })
      });
  
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      const data: Data= await response.json();
      return data.data; // Array of embeddings
    } catch (error) {
      console.error('Error fetching embeddings:', error);
      return [];
    }
  }
  
  function processLongParagraphs(text: string, wordLimit: number = 150, overlapPercent: number = 20): string[] {
    // Split text into sentences
    const sentences = text.match(/[^.!?]+[.!?]+[\])'"`’”]*/g) || [];
    if (!sentences.length) return [text]; // Return original text if no sentences found
  
    let currentChunk = "";
    const chunks = [];
    let overlapSize = 0;
  
    // Iterate over each sentence
    for (const sentence of sentences) {
      // Check if adding the sentence exceeds the word limit
      if ((currentChunk.split(' ').length + sentence.split(' ').length) > wordLimit) {
        // Push the current chunk to the chunks array
        chunks.push(currentChunk);
        // Start new chunk with overlapping words from the previous chunk
        currentChunk = currentChunk.split(' ').slice(overlapSize).join(' ') + ' ' + sentence;
        // Calculate new overlap size based on percentage
        overlapSize = Math.ceil(currentChunk.split(' ').length * (overlapPercent / 100));
      } else {
        // Add sentence to the current chunk
        currentChunk += (currentChunk ? ' ' : '') + sentence;
      }
    }
  
    // Add the last chunk if it's not empty
    if (currentChunk) {
      chunks.push(currentChunk);
    }
  
    return chunks;
  }
  
  // Function to find relevant sentences based on similarity
async function findRelevantSentences(
  text: string,
  userId: string,
  topK: number = 10, // Default value for topK
  scoreThreshold: number = 0.75// Default threshold for similarity score
): Promise<any[]> {
  const voyageApiKey = process.env.VOYAGE_API_KEY!;
  const index = pinecone.index<IndexMetaData>(PINECONE_INDEX_NAME);

  // Vectorize the input text
  const embeddings = await getEmbeddings([text], voyageApiKey);
  if (embeddings.length === 0) {
    console.error('Error in generating embeddings');
    return [];
  }

  // Query the Pinecone database with the vectorized text and filter by userId
  const queryResponse = await index.query({
    vector: embeddings[0].embedding,
    topK,
    includeValues: false, // Include only metadata, not vector values
    includeMetadata: true,
    filter: { "userId": { "$eq": userId } } // Filter based on userId
  });

  // Further filter results based on similarity score
  const filteredResults = queryResponse.matches
    .filter(match => match.score && (match.score >= scoreThreshold))
    .map(result => ({
      id: result.id,
      score: result.score,
      metadata: result.metadata
    }));

  return filteredResults;
}


