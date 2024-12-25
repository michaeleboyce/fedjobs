import { parseResumeText, parsePosition } from '../../src/Parsers/ResumeParsers';
import { singlePositionXml, multiplePositionsXml, invalidXml } from './__fixtures__/resumeXML';
import { describe, expect, test} from 'vitest';

describe('parsePosition', () => {
  test('parses valid single position correctly', () => {
    const result = parsePosition(singlePositionXml);
    
    expect(result).toEqual({
      organization: { name: 'Test Company' },
      title: { title: 'Software Engineer' },
      date: {
        startDate: '2020-01-01',
        endDate: '2021-12-31',
        present: false
      },
      details: {
        activities: ['Led development team', 'Managed projects'],
        accomplishments: ['Increased performance by 50%', 'Reduced bugs by 30%']
      }
    });
  });

  test('handles empty tags with default values', () => {
    const result = parsePosition(invalidXml.emptyTags);
    
    expect(result).toEqual({
      organization: { name: '' },
      title: { title: '' },
      date: {
        startDate: '',
        endDate: '',
        present: false
      },
      details: {
        activities: [],
        accomplishments: []
      }
    });
  });
});

describe('parseResumeText', () => {
  test('parses multiple positions correctly', () => {
    const result = parseResumeText(multiplePositionsXml);
    
    expect(result.positions).toHaveLength(2);
    expect(result.positions[0].organization.name).toBe('Company 1');
    expect(result.positions[1].organization.name).toBe('Company 2');
    expect(result.filename).toMatch(/Resume-\d+\.json/);
  });

  test('returns empty positions array for invalid XML', () => {
    const result = parseResumeText(invalidXml.missingClose);
    expect(result.positions).toEqual([]);
  });

  test('handles malformed date attributes', () => {
    const result = parseResumeText(invalidXml.malformedDate);
    expect(result.positions[0].date).toEqual({
      startDate: 'invalid',
      endDate: '',
      present: false
    });
  });
});