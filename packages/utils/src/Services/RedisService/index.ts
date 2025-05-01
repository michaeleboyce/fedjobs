import { createClient, RedisClientType } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Custom error class for Redis service errors
 */
export class RedisServiceError extends Error {
  public originalError?: any;

  constructor(message: string, originalError?: any) {
    super(message);
    this.name = 'RedisServiceError';
    this.originalError = originalError;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Service for interacting with Redis, handling connection and basic operations.
 * Assumes the Redis server is configured with appropriate maxmemory and eviction policies.
 */
class RedisService {
  private client: RedisClientType | null = null;
  private connectionPromise: Promise<void> | null = null;

  constructor() {
    // Initialize client immediately, but connect lazily
    this.client = createClient({ 
      url: process.env.REDIS_URL,
      password: process.env.REDISPASSWORD || undefined,
    });

    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
      // Reset connection promise on error to allow reconnection attempts
      this.connectionPromise = null; 
    });
  }

  /**
   * Ensures the Redis client is connected.
   */
  private async ensureConnected(): Promise<RedisClientType> {
    if (!this.client) {
      throw new RedisServiceError('Redis client not initialized.');
    }
    if (!this.client.isOpen) {
       if (!this.connectionPromise) {
         console.log('Attempting to connect to Redis...');
         this.connectionPromise = this.client.connect()
           .then(() => {
             console.log('Redis client connected successfully.');
           })
           .catch(err => {
             console.error('Redis connection failed:', err);
             this.connectionPromise = null; // Reset promise on failure
             throw new RedisServiceError('Failed to connect to Redis', err);
           });
       }
       await this.connectionPromise;
    }
     // Type assertion needed as isOpen check doesn't narrow type sufficiently here
    return this.client as RedisClientType;
  }

  /**
   * Retrieves a value from Redis.
   * @param key The key to retrieve.
   * @returns The value string, or null if the key doesn't exist.
   */
  public async get(key: string): Promise<string | null> {
    const requestId = Math.random().toString(36).substring(2, 10);
    try {
      const client = await this.ensureConnected();
      const value = await client.get(key);
      console.log(`[Redis:${requestId}] GET ${key} - ${value ? 'Hit' : 'Miss'}`);
      return value;
    } catch (error) {
      console.error(`[Redis:${requestId}] GET ${key} failed:`, error);
      // Don't throw, return null on error to treat as cache miss
      return null; 
    }
  }

  /**
   * Stores a value in Redis.
   * @param key The key to store.
   * @param value The value to store.
   * @param expirationSeconds Optional expiration time in seconds.
   */
  public async set(key: string, value: string, expirationSeconds?: number): Promise<void> {
    const requestId = Math.random().toString(36).substring(2, 10);
    try {
      const client = await this.ensureConnected();
      const options = expirationSeconds ? { EX: expirationSeconds } : undefined;
      await client.set(key, value, options);
      console.log(`[Redis:${requestId}] SET ${key} ${options ? `(EX: ${expirationSeconds}s)` : ''}`);
    } catch (error) {
      console.error(`[Redis:${requestId}] SET ${key} failed:`, error);
      // Optionally re-throw or handle error (e.g., log and continue)
      // For caching, often best to log and continue
    }
  }

  /**
   * Disconnects the Redis client.
   */
  public async disconnect(): Promise<void> {
    if (this.client && this.client.isOpen) {
      try {
        await this.client.quit();
        console.log('Redis client disconnected.');
        this.client = null;
        this.connectionPromise = null;
      } catch (error) {
        console.error('Error disconnecting Redis client:', error);
        // Force close if quit fails? Potentially needed depending on error.
        // await this.client.disconnect(); 
      }
    }
  }
}

// Export a singleton instance
export const redisService = new RedisService(); 