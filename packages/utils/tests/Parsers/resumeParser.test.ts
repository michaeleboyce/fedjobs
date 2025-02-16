// File path: packages/utils/tests/Parsers/resumeParser.test.ts
/**
 * This test suite verifies the parsing of resume XML-like strings.
 * We test both individual position parsing and full resume parsing.
 */

import { parseResumeText, parsePosition } from '../../src/Parsers/ResumeParsers';
import { singlePositionXml, multiplePositionsXml, invalidXml, largeResumeXml } from './__fixtures__/resumeXML';
import { describe, expect, test } from 'vitest';

describe('parsePosition', () => {
  test('parses valid single position correctly', () => {
    // Parse a valid single position XML string.
    const result = parsePosition(singlePositionXml);

    // Validate that the object includes the expected structure.
    // We use objectContaining so that extra fields (like the UUID and arrays) are ignored.
    expect(result).toEqual(expect.objectContaining({
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
    }));

    // Verify additional auto-generated fields.
    expect(result.positionUuid).toBeDefined();
    expect(typeof result.positionUuid).toBe('string');
    expect(result.similarPositionUuids).toEqual([]);
    expect(result.approvedSimilarPositionUuids).toEqual([]);
    expect(result.rejectedSimilarPositionUuids).toEqual([]);
  });

  test('handles empty tags with default values', () => {
    // Parse position XML that contains empty tags.
    const result = parsePosition(invalidXml.emptyTags);

    // Validate that empty values are handled as expected.
    expect(result).toEqual(expect.objectContaining({
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
    }));

    // Verify additional auto-generated fields.
    expect(result.positionUuid).toBeDefined();
    expect(typeof result.positionUuid).toBe('string');
    expect(result.similarPositionUuids).toEqual([]);
    expect(result.approvedSimilarPositionUuids).toEqual([]);
    expect(result.rejectedSimilarPositionUuids).toEqual([]);
  });
});

describe('parseResumeText', () => {
  test('parses multiple positions correctly', () => {
    // Provide a valid filename that matches the expected pattern.
    const filename = "Resume-123.json";
    const result = parseResumeText(multiplePositionsXml, filename)!;

    // Validate that two positions were parsed.
    expect(result.positions).toHaveLength(2);
    // Check the organization names of the parsed positions.
    expect(result.positions[0].organization.name).toBe('Company 1');
    expect(result.positions[1].organization.name).toBe('Company 2');
    // Ensure that the filename is correctly returned.
    expect(result.filename).toMatch(/Resume-\d+\.json/);
  });

  test('returns empty positions array for invalid XML', () => {
    // Even when XML is invalid, we pass a valid filename.
    const filename = "Resume-456.json";
    const result = parseResumeText(invalidXml.missingClose, filename)!;
    expect(result.positions).toEqual([]);
  });

  test('handles malformed date attributes', () => {
    // Test that malformed date attributes are parsed into default values.
    const filename = "Resume-789.json";
    const result = parseResumeText(invalidXml.malformedDate, filename);
    expect(result!.positions[0].date).toEqual({
      startDate: 'invalid',
      endDate: '',
      present: false
    });
  });
});

describe('parseResumeText with large resume XML', () => {
  test('parses large semi-malformed resume without error and includes specific organizations', () => {
    // Provide a filename for the large resume.
    const filename = "Resume-101.json";
    const result = parseResumeText(largeResumeXml, filename)!;

    // Ensure that positions were parsed successfully.
    expect(result).not.toBeNull();
    expect(result.positions).toBeDefined();
    expect(result.positions.length).toBeGreaterThan(0);

    // Create an array of organization names for easier checking.
    const organizationNames = result.positions.map((pos) => pos.organization.name);

    // Verify that these specific organizations are present.
    expect(organizationNames).toContain('White House Leadership Development Program');
    expect(organizationNames).toContain('Executive Office of the President, Office of Management and Budget');
  });
});
