// apps/api/src/config/index.ts
import { env } from './environment';

/**
 * Application configuration
 */
const config = {
  // Server
  env: env.NODE_ENV,
  port: env.PORT,
  apiPrefix: env.API_PREFIX,
  
  // CORS
  cors: {
    origin: env.CORS_ORIGIN,
    credentials: true,
  },
  
  // Database
  databaseUrl: env.DATABASE_URL,
  
  // Authentication keys
  auth: {
    anthropicApiKey: env.ANTHROPIC_API_KEY,
    openaiApiKey: env.OPENAI_API_KEY_35,
    geminiApiKey: env.GEMINI_API_KEY,
    voyageApiKey: env.VOYAGE_API_KEY,
  },
  
  // AWS
  aws: {
    region: env.AWS_BUCKET_REGION,
    accessKey: env.AWS_ACCESS_KEY_PROD,
    secretKey: env.AWS_SECRET_ACCESS_KEY,
    bucketName: env.AWS_BUCKET_NAME,
  },
  
  // Parsing configuration
  parsing: {
    maxFileSizeMB: env.MAX_FILE_SIZE_MB,
    uploadDir: env.UPLOAD_DIR,
  },
  
  // WebSocket/Realtime configuration
  realtime: {
    pingIntervalMs: env.WS_PING_INTERVAL_MS,
  },
  
  // Logging
  logging: {
    level: env.LOG_LEVEL,
  },
  
  // Request limits
  limits: {
    requestTimeoutMs: env.REQUEST_TIMEOUT_MS,
  },
  
  // Models
  models: {
    anthropic: {
      default: 'claude-3-7-sonnet-20250219',
    },
    openai: {
      default: 'gpt-4o',
    },
  },
};

export { env, config };