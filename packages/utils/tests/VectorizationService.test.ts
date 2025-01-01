// File path: packages/utils/tests/VectorizationService.test.ts

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import path from 'path';
import dotenv from 'dotenv';
import {
  vectorizePositions,
  vectorizePosition,
  deleteVectorizedPositions,
} from '../src/Services/VectorizationService';
import { Resume, Position } from "@fedjobs/types";
import { Pinecone } from '@pinecone-database/pinecone';
import { v4 as uuidv4 } from 'uuid'; // For generating unique IDs

// Load environment variables from the root .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Initialize Pinecone client for cleanup and testing
let pineconeClient: Pinecone;
const INDEX_NAME = 'fedjobs-test'; // Use the test index
const SLEEP_TIME = 1000;
// Store inserted IDs for cleanup
const insertedIds: string[] = [];

/**
 * Sleeps for the specified number of milliseconds.
 * @param ms - Milliseconds to sleep.
 * @returns Promise that resolves after the specified delay.
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

beforeAll(() => {
  const requiredEnvVars = ['PINECONE_API_KEY', 'VOYAGE_API_KEY'];
  requiredEnvVars.forEach((varName) => {
    if (!process.env[varName]) {
      throw new Error(`${varName} environment variable is not set`);
    }
  });
  pineconeClient = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY!,
  });
});

beforeEach(() => {
  // Optionally, reset any state or data before each test
});

afterAll(async () => {
  if (insertedIds.length === 0) return;

  const index = pineconeClient.index(INDEX_NAME);

  // Attempt to delete the records
  await index.deleteMany(insertedIds);
  console.log('Deleted Records:', insertedIds.join(', '));

  // Introduce a delay to allow deletion to process
  await sleep(SLEEP_TIME); // Wait for 5 seconds

  // Fetch the records to verify deletion
  const fetchResponse = await index.fetch(insertedIds);
  console.log('Post-Delete Fetch:', JSON.stringify(fetchResponse.records, null, 2));

  // Assert that all records are deleted
  insertedIds.forEach((id) => {
    expect(fetchResponse.records[id]).toBeUndefined();
  });
});

describe('VectorizationService Integration Tests', () => {
  it('should load environment variables correctly', () => {
    expect(process.env.VOYAGE_API_KEY).toBeDefined();
    expect(process.env.PINECONE_API_KEY).toBeDefined();
  });

  it('should generate embeddings for multiple positions, upsert to Pinecone, and delete them', async () => {
    const docId = '15'; // Fixed docId across all tests
    const userId = 'user-integration-test';

    // Generate unique position UUIDs
    const positionUuid1 = uuidv4();
    const positionUuid2 = uuidv4();

    // Mock Resume Data
    const mockResume: Resume = {
      positions: [
        {
          positionUuid: positionUuid1,
          date: {
            startDate: '2020-01-01',
            endDate: '2021-01-01',
            present: false,
          },
          details: {
            activities: ['Develop and maintain software applications.'],
            accomplishments: [],
          },
          organization: {
            name: 'Tech Corp',
          },
          title: {
            title: 'Software Engineer',
          },
        },
        {
          positionUuid: positionUuid2,
          date: {
            startDate: '2019-01-01',
            endDate: '2020-01-01',
            present: false,
          },
          details: {
            activities: ['Design and implement new features.'],
            accomplishments: [],
          },
          organization: {
            name: 'Innovate LLC',
          },
          title: {
            title: 'Software Developer',
          },
        },
      ],
      filename: 'resume_integration_test.pdf',
      // Add other necessary fields based on your Resume type
    };

    // Execute the vectorization process with specified indexName
    await vectorizePositions(mockResume, docId, userId, INDEX_NAME);
    console.log('Upserted Positions:', insertedIds.join(', '));

    // Introduce a delay to allow Pinecone to process the upsert
    // Verify that data is upserted into Pinecone
    const index = pineconeClient.index(INDEX_NAME);

    // Fetch the records to verify insertion
    console.log('Fetching Records:', insertedIds.join(', '));
    mockResume.positions.forEach((p) => insertedIds.push(`${docId}#${p.positionUuid}`));
    const fetchResponse = await index.fetch(insertedIds);
    console.log('Fetched Records:', JSON.stringify(fetchResponse.records, null, 2));

    mockResume.positions.forEach((position) => {
      const id = `${docId}#${position.positionUuid}`;
      const record = fetchResponse.records[id];
      console.log(`Verifying Record ID: ${id}`);
      expect(record).toBeDefined();
      if (record && record.metadata) {
        expect(record.metadata.filename).toBe(mockResume.filename);
        expect(record.metadata.userId).toBe(userId);
        expect(record.metadata.content).toBe(JSON.stringify(position));
        expect(record.metadata.type).toBe('position');
      } else {
        throw new Error(`Metadata missing for record ${id}`);
      }
      expect(Array.isArray(record.values)).toBe(true);
      expect(record.values.length).toBeGreaterThan(0); // Ensure embeddings exist
    });

    // Now, delete the vectorized positions using deleteVectorizedPositions
    await deleteVectorizedPositions(docId, INDEX_NAME);
    console.log('Deleted Positions with docId:', docId);

    // Introduce a short delay to allow Pinecone to process the deletion
    await sleep(SLEEP_TIME); // Wait for 5 seconds

    // Verify that records are deleted
    if (insertedIds.length > 0){  
      const postDeleteFetch = await index.fetch(insertedIds);
      console.log('Post-Delete Fetched Records:', JSON.stringify(postDeleteFetch.records, null, 2));

      insertedIds.forEach((id) => {
        console.log(`Verifying Deletion of Record ID: ${id}`);
        expect(postDeleteFetch.records[id]).toBeUndefined();
      });
    }
    // Clear insertedIds as they've been deleted
    insertedIds.length = 0;
  });

  it('should generate embeddings for a single position, upsert to Pinecone, and delete it', async () => {
    const docId = '15'; // Fixed docId across all tests
    const userId = 'user-integration-test-single';

    // Generate a unique position UUID
    const positionUuid = uuidv4();

    // Mock Position Data
    const mockPosition: Position = {
      positionUuid: positionUuid,
      date: {
        startDate: '2021-02-01',
        endDate: '2022-02-01',
        present: false,
      },
      details: {
        activities: ['Lead product development and strategy.'],
        accomplishments: [],
      },
      organization: {
        name: 'Innovate LLC',
      },
      title: {
        title: 'Product Manager',
      },
    };
    const filename = 'resume_jane_doe_integration.pdf';

    // Execute the vectorization process with specified indexName
    await vectorizePosition(mockPosition, filename, docId, userId, INDEX_NAME);
    console.log(`Upserted Single Position ID: ${docId}#${positionUuid}`);

    // Collect inserted ID for cleanup
    const insertedId = `${docId}#${mockPosition.positionUuid}`;
    insertedIds.push(insertedId);

    // Introduce a delay to allow Pinecone to process the upsert
    await sleep(SLEEP_TIME); 

    // Verify that data is upserted into Pinecone
    const index = pineconeClient.index(INDEX_NAME);

    // Fetch the record to verify insertion
    console.log(`Fetching Single Record ID: ${insertedId}`);
    const fetchResponse = await index.fetch([insertedId]);

    const record = fetchResponse.records[insertedId];
    console.log(`Verifying Single Record ID: ${insertedId}`);
    expect(record).toBeDefined();
    if (record && record.metadata) {
      expect(record.metadata.filename).toBe(filename);
      expect(record.metadata.userId).toBe(userId);
      expect(record.metadata.content).toBe(JSON.stringify(mockPosition));
      expect(record.metadata.type).toBe('position');
    } else {
      throw new Error(`Metadata missing for record ${insertedId}`);
    }
    expect(Array.isArray(record.values)).toBe(true);
    expect(record.values.length).toBeGreaterThan(0); // Ensure embeddings exist

    // Now, delete the vectorized position using deleteVectorizedPositions
    await deleteVectorizedPositions(docId, INDEX_NAME);
    console.log(`Deleted Single Position with docId: ${docId}`);

    // Introduce a short delay to allow Pinecone to process the deletion
    await sleep(SLEEP_TIME); 

    // Verify that the record is deleted
    if (insertedIds.length > 0){
      const postDeleteFetch = await index.fetch([insertedId]);

      expect(postDeleteFetch.records[insertedId]).toBeUndefined();
    }

    // Clear insertedIds as they've been deleted
    insertedIds.length = 0;
  });

  describe('deleteVectorizedPositions Function', () => {
    it('should delete all vectorized positions with the given docId prefix', async () => {
      const docId = '15'; // Fixed docId across all tests
      const userId = 'user-integration-test-delete';

      // Generate unique position UUIDs
      const positionUuid1 = uuidv4();
      const positionUuid2 = uuidv4();

      // Mock Resume Data with multiple positions
      const mockResume: Resume = {
        positions: [
          {
            positionUuid: positionUuid1,
            date: {
              startDate: '2018-01-01',
              endDate: '2019-01-01',
              present: false,
            },
            details: {
              activities: ['Manage team and projects.'],
              accomplishments: [],
            },
            organization: {
              name: 'ManageIt LLC',
            },
            title: {
              title: 'Team Lead',
            },
          },
          {
            positionUuid: positionUuid2,
            date: {
              startDate: '2017-01-01',
              endDate: '2018-01-01',
              present: false,
            },
            details: {
              activities: ['Coordinate between departments.'],
              accomplishments: [],
            },
            organization: {
              name: 'Coordination Corp',
            },
            title: {
              title: 'Coordinator',
            },
          },
        ],
        filename: 'resume_delete_test.pdf',
        // Add other necessary fields based on your Resume type
      };

      // Execute the vectorization process with specified indexName
      await vectorizePositions(mockResume, docId, userId, INDEX_NAME);
      console.log('Upserted Positions for Deletion Test:', insertedIds.join(', '));

      // Introduce a delay to allow Pinecone to process the upsert
      await sleep(SLEEP_TIME); // Wait for 5 seconds

      // Verify that data is upserted into Pinecone
      const index = pineconeClient.index(INDEX_NAME);
      mockResume.positions.forEach((p) => insertedIds.push(`${docId}#${p.positionUuid}`));

      console.log('Fetching Records for Deletion Test:', insertedIds.join(', '));
      const fetchResponse = await index.fetch(insertedIds);

      mockResume.positions.forEach((position) => {
        const id = `${docId}#${position.positionUuid}`;
        const record = fetchResponse.records[id];
        console.log(`Verifying Record ID for Deletion Test: ${id}`);
        expect(record).toBeDefined();
        if (record && record.metadata) {
          expect(record.metadata.filename).toBe(mockResume.filename);
          expect(record.metadata.userId).toBe(userId);
          expect(record.metadata.content).toBe(JSON.stringify(position));
          expect(record.metadata.type).toBe('position');
        } else {
          throw new Error(`Metadata missing for record ${id}`);
        }
        expect(Array.isArray(record.values)).toBe(true);
        expect(record.values.length).toBeGreaterThan(0); // Ensure embeddings exist
      });

      // Now, delete the vectorized positions using deleteVectorizedPositions
      await deleteVectorizedPositions(docId, INDEX_NAME);
      console.log(`Deleted Positions with docId: ${docId}`);

      // Introduce a short delay to allow Pinecone to process the deletion
      await sleep(SLEEP_TIME); // Wait for 5 seconds
      if (insertedIds.length > 0){
        // Verify that records are deleted
        const postDeleteFetch = await index.fetch(insertedIds);

        insertedIds.forEach((id) => {
          console.log(`Verifying Deletion of Record ID: ${id}`);
          expect(postDeleteFetch.records[id]).toBeUndefined();
        });
      }

      // Clear insertedIds as they've been deleted
      insertedIds.length = 0;
    });
  });
});
