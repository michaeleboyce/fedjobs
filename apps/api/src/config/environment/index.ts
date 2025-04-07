// apps/api/src/config/environment.ts
import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

/**
 * Environment variable schema with validation
 */
const envSchema = z.object({
  // Server configuration
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().transform(Number).default('3001'),
  
  // API configuration
  API_PREFIX: z.string().default('/api'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  
  // Database configuration
  DATABASE_URL: z.string(),
  
  // Authentication
  ANTHROPIC_API_KEY: z.string(),
  OPENAI_API_KEY_35: z.string().optional(),
  
  // Other APIs
  GEMINI_API_KEY: z.string().optional(),
  VOYAGE_API_KEY: z.string().optional(),
  
  // AWS
  AWS_BUCKET_REGION: z.string().optional(),
  AWS_ACCESS_KEY_PROD: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_BUCKET_NAME: z.string().optional(),
  
  // Limits and timeouts
  REQUEST_TIMEOUT_MS: z.string().transform(Number).default('30000'),
  MAX_FILE_SIZE_MB: z.string().transform(Number).default('10'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  
  // File storage
  UPLOAD_DIR: z.string().optional(),
  
  // Realtime/WebSocket
  WS_PING_INTERVAL_MS: z.string().transform(Number).default('30000'),
});

/**
 * Parse and validate environment variables
 */
export function validateEnv() {
  const result = envSchema.safeParse(process.env);
  
  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    console.error(
      result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('\n')
    );
    process.exit(1);
  }
  
  return result.data;
}

// Export validated environment variables
export const env = validateEnv();