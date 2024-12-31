// File path: apps/web/drizzle.config.ts
import { Config } from "drizzle-kit"
import dotenv from 'dotenv';

dotenv.config({
  path: '.env.local',
});

export default {
  schema: "./app/_db/schema/*",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.MIGRATION_DATABASE_URL!, 
},
out: "./drizzle",
} satisfies Config