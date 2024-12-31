// File path: packages/database/drizzle.config.ts
import { Config } from "drizzle-kit"
import path from 'path'
import dotenv from 'dotenv';

dotenv.config({
  path: path.resolve(__dirname, '../../.env.local'),
});

export default {
  schema: "./src/schema/*",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.MIGRATION_DATABASE_URL!, 
},
out: "./drizzle",
} satisfies Config