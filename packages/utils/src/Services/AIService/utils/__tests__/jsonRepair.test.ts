// File path: packages/utils/src/Services/AIService/utils/__tests__/jsonRepair.test.ts
import { describe, it, expect } from 'vitest';
import { repairJson, safeJsonParse, extractJsonFromText } from '../jsonRepair';

describe('JSON Repair Utilities', () => {
  describe('repairJson', () => {
    it('should return the original string if it is valid JSON', () => {
      const validJson = '{"name":"John","age":30,"skills":["JavaScript","TypeScript"]}';
      expect(repairJson(validJson)).toBe(validJson);
    });

    it('should fix unescaped quotes in strings', () => {
      const invalidJson = '{"description":"This is a "quoted" text"}';
      const repaired = repairJson(invalidJson);
      
      expect(() => JSON.parse(repaired)).not.toThrow();
      expect(JSON.parse(repaired).description).toContain('quoted');
    });

    it('should fix trailing commas in objects', () => {
      const invalidJson = '{"name":"Jane","age":25,}';
      const repaired = repairJson(invalidJson);
      
      expect(() => JSON.parse(repaired)).not.toThrow();
      expect(JSON.parse(repaired)).toEqual({ name: 'Jane', age: 25 });
    });

    it('should fix trailing commas in arrays', () => {
      const invalidJson = '["apple","banana","cherry",]';
      const repaired = repairJson(invalidJson);
      
      expect(() => JSON.parse(repaired)).not.toThrow();
      expect(JSON.parse(repaired)).toEqual(['apple', 'banana', 'cherry']);
    });

    it('should add missing quotes to property names', () => {
      const invalidJson = '{name:"Alice",age:30}';
      const repaired = repairJson(invalidJson);
      
      expect(() => JSON.parse(repaired)).not.toThrow();
      expect(JSON.parse(repaired)).toEqual({ name: 'Alice', age: 30 });
    });

    it('should add missing closing braces to objects', () => {
      const invalidJson = '{"user":{"name":"Bob","age":40';
      const repaired = repairJson(invalidJson);
      
      expect(() => JSON.parse(repaired)).not.toThrow();
      expect(JSON.parse(repaired)).toEqual({ user: { name: 'Bob', age: 40 } });
    });

    it('should add missing closing brackets to arrays', () => {
      const invalidJson = '{"items":["foo","bar"';
      const repaired = repairJson(invalidJson);
      
      expect(() => JSON.parse(repaired)).not.toThrow();
      expect(JSON.parse(repaired)).toEqual({ items: ['foo', 'bar'] });
    });

    it('should handle complex nested structures', () => {
      const invalidJson = '{users:[{name:"Alice",hobbies:["reading","hiking",]},{name:"Bob",skills:{programming:true,languages:["JavaScript","Python",]},}],}';
      const repaired = repairJson(invalidJson);
      
      expect(() => JSON.parse(repaired)).not.toThrow();
      
      const parsed = JSON.parse(repaired);
      expect(parsed.users).toHaveLength(2);
      expect(parsed.users[0].name).toBe('Alice');
      expect(parsed.users[1].skills.languages).toContain('Python');
    });
  });

  describe('safeJsonParse', () => {
    it('should parse valid JSON normally', () => {
      const validJson = '{"name":"John","age":30}';
      expect(safeJsonParse(validJson)).toEqual({ name: 'John', age: 30 });
    });

    it('should repair and parse invalid JSON', () => {
      const invalidJson = '{name:"Alice",age:30,}';
      expect(safeJsonParse(invalidJson)).toEqual({ name: 'Alice', age: 30 });
    });

    it('should throw an error for completely invalid JSON', () => {
      const invalidJson = '{This is not JSON at all';
      expect(() => safeJsonParse(invalidJson)).toThrow();
    });
  });

  describe('extractJsonFromText', () => {
    it('should extract valid JSON objects from text', () => {
      const text = 'Here is some text {"name":"John"} and more text {"age":30}';
      const extracted = extractJsonFromText(text);
      
      expect(extracted).toHaveLength(2);
      expect(extracted[0]).toEqual({ name: 'John' });
      expect(extracted[1]).toEqual({ age: 30 });
    });

    it('should repair and extract invalid JSON objects', () => {
      const text = 'Text with {name:"Alice"} and {age:30,}';
      const extracted = extractJsonFromText(text);
      
      expect(extracted).toHaveLength(2);
      expect(extracted[0]).toEqual({ name: 'Alice' });
      expect(extracted[1]).toEqual({ age: 30 });
    });

    it('should extract array JSON', () => {
      const text = 'Here is an array: ["apple","banana","cherry"]';
      const extracted = extractJsonFromText(text);
      
      expect(extracted).toHaveLength(1);
      expect(extracted[0]).toEqual(['apple', 'banana', 'cherry']);
    });

    it('should return an empty array if no JSON is found', () => {
      const text = 'This text contains no JSON objects';
      expect(extractJsonFromText(text)).toEqual([]);
    });
  });
});