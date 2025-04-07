// File path: packages/crawler/src/utils/organization-type.normalizer.ts
import { organizationType } from '@fedjobs/database';

/**
 * Utility class for normalizing organization type strings to database enum values
 */
export class OrganizationTypeNormalizer {
  /**
   * Map of common organization type variations to normalized values
   */
  private static typeMap: Record<string, (typeof organizationType.enumValues)[number]> = {
    'GOVERNMENT': 'GOVERNMENT',
    'FEDERAL': 'GOVERNMENT',
    'STATE': 'GOVERNMENT',
    'LOCAL': 'GOVERNMENT',
    'GOV': 'GOVERNMENT',
    'NONPROFIT': 'NONPROFIT',
    'NON-PROFIT': 'NONPROFIT',
    'NON PROFIT': 'NONPROFIT',
    'NOT FOR PROFIT': 'NONPROFIT',
    'PRIVATE': 'PRIVATE',
    'PRIVATE SECTOR': 'PRIVATE',
    'CORPORATION': 'PRIVATE',
    'PUBLIC': 'PUBLIC',
    'PUBLICLY TRADED': 'PUBLIC',
    'PUBLIC COMPANY': 'PUBLIC',
    'ACADEMIC': 'ACADEMIC',
    'EDUCATION': 'ACADEMIC',
    'UNIVERSITY': 'ACADEMIC',
    'COLLEGE': 'ACADEMIC',
    'SCHOOL': 'ACADEMIC',
    'STARTUP': 'STARTUP',
    'START-UP': 'STARTUP',
    'START UP': 'STARTUP',
  };
  
  /**
   * Normalize an organization type string to a database enum value
   * @param type Organization type string to normalize
   * @returns Normalized organization type or undefined if not recognized
   */
  static normalize(type?: string): (typeof organizationType.enumValues)[number] | undefined {
    if (!type) return undefined;
    
    // Convert to uppercase for comparison
    const normalized = type.toUpperCase();
    
    return this.typeMap[normalized] || 'OTHER';
  }
}