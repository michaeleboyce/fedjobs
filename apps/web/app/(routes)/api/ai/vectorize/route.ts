// File path: apps/web/app/(routes)/api/ai/vectorize/route.ts
'use server'
import { Pinecone } from '@pinecone-database/pinecone';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { PassThrough } from 'stream';
import { NextRequest } from 'next/server';

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
// Initialize Pinecone
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});



export async function POST(request: NextRequest) { 
  const result = await request.json(); 
  const {docName, text}: {docName: string, text: string} = result
  const stream = new PassThrough();
  if (typeof docName !== "string") {
    console.error('parameter to vectorize route did not pass a string');
    throw new Error('parameter to vectorize route did not pass a string')
  }
  const { isAuthenticated, getUser } = await getKindeServerSession();
  if (!(await isAuthenticated())) {
    console.error('User not authenticated');
    throw new Error('User not authenticated')
  }
  const user = await getUser();
  if (!user) {
    console.error('Error acquiring user info');
    throw new Error('Error acquiring user info');
  } 


  const voyageApiKey = process.env.VOYAGE_API_KEY!;
  const indexName = 'fedjobs';
  const encoder = new TextEncoder();

  const documentProcessingIterator = processAndSaveDocument(text, docName, user.id, voyageApiKey, indexName);
  async function* makeIterator() {
    for await (const progressUpdate of documentProcessingIterator) {
      // Yield the progress update as a JSON string
      yield encoder.encode(JSON.stringify(progressUpdate));
    }

    // Optionally, send additional info here
    //yield encoder.encode(JSON.stringify({ thread_id: thread._id }));
  }

  return new Response(iteratorToStream(makeIterator()));
}

async function* processAndSaveDocument(documentText: string, docName: string, userId: string, voyageApiKey: string, indexName: string) {
  const paragraphs = documentText.split(/\n\n+/);
  const batchSize = 128;
  const index = pinecone.index<IndexMetaData>(indexName);

  for (let i = 0; i < paragraphs.length; i += batchSize) {
    const batch = paragraphs.slice(i, i + batchSize);
    const embeddings = await getEmbeddings(batch, voyageApiKey);

    if (embeddings.length > 0) {
      await checkOrCreateIndex(indexName, embeddings[0].embedding.length);
    }

    const toUpsert = embeddings.map((emb, index) => ({
      id: `${i + index}`,
      values: emb.embedding,
      metadata: { docName, userId, text: batch[index] },
    }));
    await index.upsert(toUpsert);

    // Yield progress update
    yield { status: 'processing', progress: (i / paragraphs.length) * 100 };
  }

  // Final yield to indicate completion
  yield { status: 'complete', progress: 100 };
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

function iteratorToStream(iterator: any) {
  return new ReadableStream({
    async pull(controller) {
      const { value, done } = await iterator.next()

      if (done) {
        controller.close()
      } else {
        controller.enqueue(value)
      }
    },
  })
}