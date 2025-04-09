// packages/crawler/src/job-boards/constants.ts
export interface JobBoardInfo {
    name: string;
    domains: string[];
    patterns: RegExp[];
  }
  
  export const KNOWN_JOB_BOARDS: JobBoardInfo[] = [
    {
      name: 'Ashby',
      domains: ['jobs.ashbyhq.com'],
      patterns: [
        /https?:\/\/jobs\.ashbyhq\.com\/[^\/]+\/?$/i,              // Company page
        /https?:\/\/jobs\.ashbyhq\.com\/[^\/]+\/[^\/]+\/?$/i       // Specific job
      ]
    },
    {
      name: 'Greenhouse',
      domains: ['job-boards.greenhouse.io', 'boards.greenhouse.io', 'greenhouse.io'],
      patterns: [
        /https?:\/\/job-boards\.greenhouse\.io\/[^\/]+\/?$/i,      // Company page
        /https?:\/\/job-boards\.greenhouse\.io\/[^\/]+\/jobs\/[^\/]+\/?$/i  // Specific job
      ]
    },
    {
      name: 'Lever',
      domains: ['jobs.eu.lever.co', 'jobs.lever.co'],
      patterns: [
        /https?:\/\/jobs\.(?:eu\.)?lever\.co\/[^\/]+\/?$/i,         // Company page
        /https?:\/\/jobs\.(?:eu\.)?lever\.co\/[^\/]+\/[^\/]+\/?$/i  // Specific job
      ]
    }
  ];
  
  // Check if a domain belongs to a known job board
  export function isKnownJobBoardDomain(domain: string): boolean {
    const normalizedDomain = domain.toLowerCase();
    return KNOWN_JOB_BOARDS.some(board => 
      board.domains.some(d => normalizedDomain === d || normalizedDomain.endsWith(`.${d}`))
    );
  }
  
  // Check if a URL matches known job board patterns
  export function matchesJobBoardPattern(url: string): boolean {
    return KNOWN_JOB_BOARDS.some(board => 
      board.patterns.some(pattern => pattern.test(url))
    );
  }