// File path: packages/crawler/src/utils/employment-type.normalizer.ts
import { employmentType } from '@fedjobs/database';

/**
 * Utility class for normalizing employment type strings to database enum values
 */
export class EmploymentTypeNormalizer {
  /**
   * Map of common employment type variations to normalized values
   */
  private static typeMap: Record<string, (typeof employmentType.enumValues)[number]> = {
    'INTERN': 'INTERNSHIP',
    'INTERNSHIP': 'INTERNSHIP',
    'FULL TIME': 'FULL_TIME',
    'FULLTIME': 'FULL_TIME',
    'FULL-TIME': 'FULL_TIME',
    'FULL_TIME': 'FULL_TIME',
    'PART TIME': 'PART_TIME', 
    'PARTTIME': 'PART_TIME',
    'PART-TIME': 'PART_TIME',
    'PART_TIME': 'PART_TIME',
    'CONTRACT': 'CONTRACT',
    'CONTRACTOR': 'CONTRACT',
    'TEMPORARY': 'TEMPORARY',
    'TEMP': 'TEMPORARY',
    'REMOTE': 'REMOTE',
    'HYBRID': 'HYBRID',
    'FREELANCE': 'CONTRACT',
  };
  
  /**
   * Normalize an employment type string to a database enum value
   * @param type Employment type string to normalize
   * @returns Normalized employment type or undefined if not recognized
   */
  static normalize(type?: string): (typeof employmentType.enumValues)[number] | undefined {
    if (!type) return undefined;
    
    // Convert to uppercase for comparison
    const normalized = type.toUpperCase();
    
    return this.typeMap[normalized] || 'OTHER';
  }
}