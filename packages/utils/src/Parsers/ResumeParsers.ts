// File path: packages/utils/src/Parsers/ResumeParsers.ts
/**
 * This file contains functions for parsing XML-like annotated resume texts.
 * It extracts positions and their details and returns structured objects.
 */

import { Resume, Position, Organization, Title, ResumeDate, Details } from '@fedjobs/types/src/ResumeTypes';
import { v4 as uuidV4 } from 'uuid';

/**
 * Extracts the content inside a single tag.
 * @param text - the source text to search within.
 * @param tagName - the tag to look for.
 * @returns the trimmed text inside the tag or an empty string if not found.
 */
const extractTagContent = (text: string, tagName: string): string => {
  const regex = new RegExp(`<${tagName}[^>]*>(.*?)<\/${tagName}>`, 's');
  const match = regex.exec(text);
  return match ? match[1].trim() : '';
};

/**
 * Extracts content for multiple occurrences of a tag.
 * @param text - the source text.
 * @param tagName - the tag to search for.
 * @returns an array of trimmed contents for all occurrences.
 */
const extractMultipleTagContents = (text: string, tagName: string): string[] => {
  const regex = new RegExp(`<${tagName}[^>]*>(.*?)<\/${tagName}>`, 'gs');
  const contents: string[] = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    contents.push(match[1].trim());
  }
  return contents;
};

/**
 * Extracts the value of an attribute from a specific tag.
 * @param text - the text containing the tag.
 * @param tagName - the tag name.
 * @param attributeName - the attribute to extract.
 * @returns the trimmed attribute value or an empty string if not found.
 */
const extractAttribute = (text: string, tagName: string, attributeName: string): string => {
  const regex = new RegExp(`<${tagName}[^>]*${attributeName}="(.*?)"[^>]*>`, 's');
  const match = regex.exec(text);
  return match ? match[1].trim() : '';
};

/**
 * Parses a block of XML-like text representing a position.
 * @param positionText - the XML-like string for a position.
 * @returns a Position object containing organization, title, date, details, and additional fields.
 */
export const parsePosition = (positionText: string): Position => {
  const organization: Organization = {
    name: extractTagContent(positionText, "organization"),
  };

  const title: Title = {
    title: extractTagContent(positionText, "title"),
  };

  const date: ResumeDate = {
    startDate: extractAttribute(positionText, "date", "startDate"),
    endDate: extractAttribute(positionText, "date", "endDate"),
    present: extractAttribute(positionText, "date", "present") === "true",
  };

  const detailsText = extractTagContent(positionText, "details");
  const details: Details = {
    activities: extractMultipleTagContents(detailsText, "activity"),
    accomplishments: extractMultipleTagContents(detailsText, "accomplishment"),
  };

  // Generate a unique identifier for the position.
  const positionUuid = uuidV4();

  return {
    positionUuid,
    organization,
    title,
    date,
    details,
    similarPositionUuids: [],
    approvedSimilarPositionUuids: [],
    rejectedSimilarPositionUuids: []
  };
};

/**
 * Parses a resume text file that contains XML-like annotations.
 * 
 * @param text - the text of the resume file.
 * @param filename - the name of the resume file.
 * @returns a Resume object or null in case of an error.
 */
export const parseResumeText = (text: string, filename: string): Resume | null => {
  try {
    // Regex to capture all <position> ... </position> blocks.
    const positionRegex = /<position>(.*?)<\/position>/gs;
    const positions: Position[] = [];
    let match;

    while ((match = positionRegex.exec(text)) !== null) {
      const positionBlock = match[1];
      const position = parsePosition(positionBlock);
      positions.push(position);
    }

    return {
      positions,
      filename: filename,
    };
  } catch (err) {
    console.error("Error parsing annotated resume text:", err);
    return null;
  }
};
