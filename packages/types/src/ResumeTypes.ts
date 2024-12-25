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
    organization: Organization;
    title: Title;
    date: ResumeDate;
    details: Details;
  }
  
  export interface Resume {
    positions: Position[];
    filename: string;
  }