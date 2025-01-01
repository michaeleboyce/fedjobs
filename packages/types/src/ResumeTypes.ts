// File path: packages/types/src/ResumeTypes.ts

export interface Organization {
  name: string;
}

export interface Title {
  title: string;
}

export interface ResumeDate {
  startDate: string;
  endDate: string;
  present: boolean;
}

export interface Details {
  activities: string[];
  accomplishments: string[];
}

export interface Position {
  positionUuid: string;
  organization: Organization;
  title: Title;
  date: ResumeDate;
  details: Details;
  groupId?: string; // Optional field for grouping positions
}

export interface Resume {
  positions: Position[];
  filename: string;
}
