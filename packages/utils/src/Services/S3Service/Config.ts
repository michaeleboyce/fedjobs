// File path: packages/utils/src/Services/S3Service/Config.ts
// packages/utils/src/Services/S3Service/Config.ts

export const AWS_CONFIG = {
  region: process.env.AWS_BUCKET_REGION!,
  accessKeyId: process.env.AWS_ACCESS_KEY_PROD!,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  bucketName: process.env.AWS_BUCKET_NAME!,
};

// S3 permissions needed
export const REQUIRED_S3_PERMISSIONS = [
  's3:PutObject',
  's3:GetObject',
  's3:DeleteObject',
  's3:ListBucket'
];

export const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '104857600'); // 100 MB
export const ALLOWED_FILE_TYPES = [
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/pdf"
];
export const SIGNED_URL_EXPIRATION = 60; // seconds
export const GET_URL_EXPIRATION = 300; // seconds