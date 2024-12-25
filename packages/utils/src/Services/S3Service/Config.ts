// packages/utils/src/Constants/Config.ts

import { config as dotenvConfig } from 'dotenv';

dotenvConfig();

export const AWS_CONFIG = {
  region: process.env.AWS_BUCKET_REGION!,
  accessKeyId: process.env.AWS_ACCESS_KEY_PROD!,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  bucketName: process.env.AWS_BUCKET_NAME!,
};

export const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '104857600'); // 100 MB
export const ALLOWED_FILE_TYPES = [
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/pdf"
];
export const SIGNED_URL_EXPIRATION = 60; // seconds
export const GET_URL_EXPIRATION = 300; // seconds