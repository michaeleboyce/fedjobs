import { Resume, Position, Organization, Title, ResumeDate, Details } from '@fedjobs/types/src/ResumeTypes';

const extractTagContent = (text: string, tagName: string): string => {
  const regex = new RegExp(`<${tagName}[^>]*>(.*?)<\/${tagName}>`, 's');
  const match = regex.exec(text);
  return match ? match[1].trim() : '';
};

const extractMultipleTagContents = (text: string, tagName: string): string[] => {
  const regex = new RegExp(`<${tagName}[^>]*>(.*?)<\/${tagName}>`, 'gs');
  const contents: string[] = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    contents.push(match[1].trim());
  }
  return contents;
};

const extractAttribute = (text: string, tagName: string, attributeName: string): string => {
  const regex = new RegExp(`<${tagName}[^>]*${attributeName}="(.*?)"[^>]*>`, 's');
  const match = regex.exec(text);
  return match ? match[1].trim() : '';
};

export const parsePosition = (positionText: string): Position => {
  const organization: Organization = {
    name: extractTagContent(positionText, "organization")
  };

  const title: Title = {
    title: extractTagContent(positionText, "title")
  };

  const date: ResumeDate = {
    startDate: extractAttribute(positionText, "date", "startDate"),
    endDate: extractAttribute(positionText, "date", "endDate"),
    present: extractAttribute(positionText, "date", "present") === "true"
  };

  const detailsText = extractTagContent(positionText, "details");
  const details: Details = {
    activities: extractMultipleTagContents(detailsText, "activity"),
    accomplishments: extractMultipleTagContents(detailsText, "accomplishment")
  };

  return { organization, title, date, details };
};

export const parseResumeText = (text: string): Resume => {
  const positionRegex = /<position>(.*?)<\/position>/gs;
  const positions: Position[] = [];
  
  let match;
  while ((match = positionRegex.exec(text)) !== null) {
    try {
      const position = parsePosition(match[1]);
      positions.push(position);
    } catch (error) {
      console.error("Error parsing position:", error);
    }
  }

  return {
    positions,
    filename: `Resume-${Date.now()}.json`
  };
};