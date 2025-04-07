// File path: packages/crawler/__tests__/utils/employment-type.normalizer.spec.ts
import { describe, it, expect } from 'vitest';
import { EmploymentTypeNormalizer } from '../../src/utils/employment-type.normalizer';

describe('EmploymentTypeNormalizer', () => {
  describe('normalize', () => {
    it('should return undefined for undefined or empty input', () => {
      expect(EmploymentTypeNormalizer.normalize(undefined)).toBeUndefined();
      expect(EmploymentTypeNormalizer.normalize('')).toBeUndefined();
    });
    
    it('should normalize common full-time variations', () => {
      const variations = [
        'FULL TIME',
        'FULLTIME',
        'FULL-TIME',
        'FULL_TIME'
      ];
      
      for (const variation of variations) {
        expect(EmploymentTypeNormalizer.normalize(variation)).toBe('FULL_TIME');
      }
    });
    
    it('should normalize common part-time variations', () => {
      const variations = [
        'PART TIME',
        'PARTTIME',
        'PART-TIME',
        'PART_TIME'
      ];
      
      for (const variation of variations) {
        expect(EmploymentTypeNormalizer.normalize(variation)).toBe('PART_TIME');
      }
    });
    
    it('should normalize contract and freelance variations', () => {
      expect(EmploymentTypeNormalizer.normalize('CONTRACT')).toBe('CONTRACT');
      expect(EmploymentTypeNormalizer.normalize('CONTRACTOR')).toBe('CONTRACT');
      expect(EmploymentTypeNormalizer.normalize('FREELANCE')).toBe('CONTRACT');
    });
    
    it('should normalize temporary variations', () => {
      expect(EmploymentTypeNormalizer.normalize('TEMPORARY')).toBe('TEMPORARY');
      expect(EmploymentTypeNormalizer.normalize('TEMP')).toBe('TEMPORARY');
    });
    
    it('should normalize internship variations', () => {
      expect(EmploymentTypeNormalizer.normalize('INTERNSHIP')).toBe('INTERNSHIP');
      expect(EmploymentTypeNormalizer.normalize('INTERN')).toBe('INTERNSHIP');
    });
    
    it('should normalize remote and hybrid types', () => {
      expect(EmploymentTypeNormalizer.normalize('REMOTE')).toBe('REMOTE');
      expect(EmploymentTypeNormalizer.normalize('HYBRID')).toBe('HYBRID');
    });
    
    it('should normalize to OTHER for unrecognized types', () => {
      expect(EmploymentTypeNormalizer.normalize('UNKNOWN_TYPE')).toBe('OTHER');
      expect(EmploymentTypeNormalizer.normalize('CUSTOM')).toBe('OTHER');
      expect(EmploymentTypeNormalizer.normalize('SOMETHING_ELSE')).toBe('OTHER');
    });
    
    it('should be case insensitive', () => {
      expect(EmploymentTypeNormalizer.normalize('full-time')).toBe('FULL_TIME');
      expect(EmploymentTypeNormalizer.normalize('Part Time')).toBe('PART_TIME');
      expect(EmploymentTypeNormalizer.normalize('Remote')).toBe('REMOTE');
    });
  });
});