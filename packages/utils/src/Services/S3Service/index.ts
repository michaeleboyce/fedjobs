// File path: packages/utils/src/Services/S3Service/index.ts
// packages/utils/src/Services/s3Service.ts

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { AWS_CONFIG, SIGNED_URL_EXPIRATION, GET_URL_EXPIRATION } from './Config';

export type SignedURLResponse = 
  | { status: 'success'; url: string }
  | { status: 'failure'; message: string };

const s3Client = new S3Client({
  region: AWS_CONFIG.region,
  credentials: {
    accessKeyId: AWS_CONFIG.accessKeyId,
    secretAccessKey: AWS_CONFIG.secretAccessKey,
  },
});
export const uploadFile = async (
  s3Key: string,
  fileName: string,
  fileType: string,
  userId: string,
  fileSize: number
): Promise<SignedURLResponse> => {
  const putObjectCommand = new PutObjectCommand({
    Bucket: AWS_CONFIG.bucketName,
    Key: s3Key,
    ContentType: fileType,
    ContentLength: fileSize,
    Metadata: {
      userId,
      fileName,
    },
  });

  try {
    const url = await getSignedUrl(s3Client, putObjectCommand, { expiresIn: SIGNED_URL_EXPIRATION });
    return { status: 'success', url };
  } catch (error: any) {
    console.error('Error uploading file:', error);
    return { status: 'failure', message: error.message || 'Failed to upload file.' };
  }
};
export const getPreSignedUrlforClient= async (
  s3Key: string,
  fileName: string,
  fileType: string,
  userId: string,
  fileSize: number
): Promise<SignedURLResponse> => {
  const putObjectCommand = new PutObjectCommand({
    Bucket: AWS_CONFIG.bucketName,
    Key: s3Key,
    ContentType: fileType,
    ContentLength: fileSize,
    Metadata: {
      userId,
      fileName,
    },
  });

  try {
    const url = await getSignedUrl(s3Client, putObjectCommand, { expiresIn: SIGNED_URL_EXPIRATION });
    // Suppose you've received `presignedUrl` back from the server:
    return { status: 'success', url };
  } catch (error: any) {
    console.error('Error uploading file:', error);
    return { status: 'failure', message: error.message || 'Failed to upload file.' };
  }
};

export const getFileUrl = async (s3Key: string): Promise<string> => {
    const getObjectCommand = new GetObjectCommand({
        Bucket: AWS_CONFIG.bucketName,
        Key: s3Key,
    });

    const url = await getSignedUrl(s3Client, getObjectCommand, { expiresIn: GET_URL_EXPIRATION });
    return url;
};

export const deleteFile = async (s3Key: string): Promise<void> => {
    const deleteObjectCommand = new DeleteObjectCommand({
        Bucket: AWS_CONFIG.bucketName,
        Key: s3Key,
    });

    await s3Client.send(deleteObjectCommand);
};

export * from './Config';