// File path: apps/web/app/features/positions/actions/__tests__/vectorizePositions.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { vectorizePositions, generatePositionEmbeddings, createPineconeRecords, EmbeddingResult } from '../vectorizePositions';
import { Pinecone } from '@pinecone-database/pinecone';
import { Position } from '@fedjobs/types';

process.removeAllListeners('warning');
process.on('warning', (warning) => {
  if (warning.name === 'DeprecationWarning' && 
      warning.message.includes('The `punycode` module is deprecated')) {
    return;
  }
  console.warn(warning);
});

vi.mock('voyage-ai-provider', () => ({
  voyage: {
    textEmbeddingModel: vi.fn().mockReturnValue({
      embedMany: vi.fn().mockResolvedValue({
        embeddings: [new Float32Array([0.1, 0.2, 0.3])]
      })
    })
  }
}));

vi.mock('@pinecone-database/pinecone', () => ({
  Pinecone: vi.fn().mockImplementation(() => ({
    index: vi.fn().mockReturnValue({
      upsert: vi.fn().mockResolvedValue({})
    })
  }))
}));

describe('vectorize position functions', () => {
  const userId = 'kp_03ed91010b5448968dda04746a370830';
  const mockPosition: Position = {
    positionUuid: 'test-uuid-123',
    organization: { name: "Department of Homeland Security" },
    title: { title: "Director of the Artificial Intelligence Corps" },
    details: { activities: ["Founded and led the largest civilian AI team"],
        accomplishments: []
     },
    date: {
        startDate: '1-1-2024',
        endDate: '',
        present: true
    },
    similarPositionUuids: [],
    approvedSimilarPositionUuids: [],
    rejectedSimilarPositionUuids: []
  };

  const mockResume = {
    positions: [mockPosition],
    filename: "Resume-1735628610539.json"
  };
  const mockPositionString = JSON.stringify(mockPosition);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generatePositionEmbeddings', () => {
    it('should generate embeddings from position data', async () => {
      const result = await generatePositionEmbeddings([mockPositionString]);

      expect(result).toEqual([{
        content: mockPosition,
        embedding: expect.any(Float32Array)
      }]);
    });
  });

  describe('createPineconeRecords', () => {
    it('should create properly formatted records for Pinecone', () => {
      const mockEmbeddings: EmbeddingResult[]= [{
        content: mockPosition,
        embedding: [0.1, 0.2, 0.3]
      }];

      const records = createPineconeRecords(
        [mockPositionString],
        mockEmbeddings,
        mockResume.filename,
        userId
      );

      expect(records).toEqual([{
        id: `position-0-${mockResume.filename}`,
        values: mockEmbeddings[0].embedding,
        metadata: {
          filename: mockResume.filename,
          userId,
          content: mockPositionString
        }
      }]);
    });
  });

  describe('vectorizePositions', () => {
    it('should process positions and upload to Pinecone', async () => {
      await vectorizePositions(mockResume as any, userId);

      expect(Pinecone).toHaveBeenCalledWith({
        apiKey: expect.any(String)
      });

      const pineconeInstance = new Pinecone({ apiKey: '' });
      const indexMock = pineconeInstance.index('fedjobs');
      
      expect(indexMock.upsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: expect.stringContaining('position-0-Resume-1735628610539.json'),
            values: expect.any(Array),
            metadata: expect.objectContaining({
              filename: 'Resume-1735628610539.json',
              userId: 'kp_03ed91010b5448968dda04746a370830',
              content: expect.any(String)
            })
          })
        ])
      );
    });
  });
}); 