// File path: packages/utils/src/Services/AIService/utils/jsonRepair.ts

/**
 * Utility for repairing malformed JSON from AI responses
 * 
 * This utility handles common issues in JSON returned by AI models:
 * - Unescaped quotes in strings
 * - Trailing commas in objects and arrays
 * - Missing quotes around property names
 * - Unclosed objects or arrays
 */

/**
 * Attempts to repair malformed JSON by fixing common issues
 * @param jsonString Potentially malformed JSON string
 * @returns Repaired JSON string that should be parseable
 */
export function repairJson(jsonString: string): string {
  try {
    // First check if it's already valid
    JSON.parse(jsonString);
    return jsonString; // If we get here, JSON is valid
  } catch (error) {
    console.log('[JSONRepair] Attempting to repair malformed JSON...');
    
    let repairedJson = jsonString;
    
    // Fix 1: Handle unescaped quotes in strings
    repairedJson = repairedJson.replace(/(?<!\\)(?:\\{2})*"([^"]*?)(?<!\\)(?:\\{2})*"/g, (match) => {
      // Replace all unescaped quotes inside the match with escaped quotes
      return match.replace(/(?<!\\)"/g, '\\"');
    });
    
    // Fix 2: Fix trailing commas in objects and arrays
    repairedJson = repairedJson.replace(/,\s*([\]}])/g, '$1');
    
    // Fix 3: Add missing quotes to property names
    repairedJson = repairedJson.replace(/([{,]\s*)([a-zA-Z0-9_$]+)(\s*:)/g, '$1"$2"$3');
    
    // Fix 4: Ensure proper object closure
    const openBraces = (repairedJson.match(/{/g) || []).length;
    const closeBraces = (repairedJson.match(/}/g) || []).length;
    if (openBraces > closeBraces) {
      repairedJson += '}'.repeat(openBraces - closeBraces);
    }
    
    // Fix 5: Ensure proper array closure
    const openBrackets = (repairedJson.match(/\[/g) || []).length;
    const closeBrackets = (repairedJson.match(/\]/g) || []).length;
    if (openBrackets > closeBrackets) {
      repairedJson += ']'.repeat(openBrackets - closeBrackets);
    }
    
    // Try to parse the repaired JSON
    try {
      JSON.parse(repairedJson);
      console.log('[JSONRepair] JSON repair successful');
      return repairedJson;
    } catch (repairError) {
      console.error('[JSONRepair] JSON repair failed:', repairError);
      
      // Last resort: try to extract any valid JSON objects from the response
      const jsonMatches = jsonString.match(/({[\s\S]*}|\[[\s\S]*\])/g);
      if (jsonMatches && jsonMatches.length > 0) {
        for (const match of jsonMatches) {
          try {
            JSON.parse(match);
            console.log('[JSONRepair] Found valid JSON subset');
            return match;
          } catch (e) {
            // Keep trying other matches
          }
        }
      }
      
      // If all else fails, return the original 
      return jsonString;
    }
  }
}

/**
 * Safely parses JSON with automatic repair attempts
 * @param jsonString Potentially malformed JSON string
 * @returns Parsed JSON object
 * @throws Error if JSON cannot be parsed even after repair
 */
export function safeJsonParse<T = any>(jsonString: string): T {
  try {
    // First try direct parsing
    return JSON.parse(jsonString) as T;
  } catch (error) {
    // Try to repair and parse
    const repairedJson = repairJson(jsonString);
    try {
      return JSON.parse(repairedJson) as T;
    } catch (repairError) {
      // Log the problematic JSON for debugging
      console.error('[JSONRepair] Failed to parse JSON even after repair');
      console.error('[JSONRepair] Original JSON:', jsonString.substring(0, 500) + '...');
      console.error('[JSONRepair] Repaired JSON:', repairedJson.substring(0, 500) + '...');
      throw new Error(`Failed to parse JSON: ${repairError}`);
    }
  }
}

/**
 * Extracts and repairs any JSON-like objects from a larger text
 * Useful for handling AI responses that may include text along with JSON
 * @param text Text that might contain JSON
 * @returns Array of parsed JSON objects found in the text
 */
export function extractJsonFromText<T = any>(text: string): T[] {
  const results: T[] = [];
  const jsonMatches = text.match(/({[\s\S]*?}|\[[\s\S]*?\])/g) || [];
  
  for (const match of jsonMatches) {
    try {
      // Try to parse directly
      const parsed = JSON.parse(match) as T;
      results.push(parsed);
    } catch (e) {
      // Try to repair and parse
      try {
        const repaired = repairJson(match);
        const parsed = JSON.parse(repaired) as T;
        results.push(parsed);
      } catch (repairError) {
        // Skip this match if we can't parse it
      }
    }
  }
  
  return results;
}