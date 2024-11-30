import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'


export * from 'drizzle-orm'

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { logger: true});
