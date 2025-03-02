// File path: apps/web/app/features/documents/utils/fileHelpers.ts
import { mkdir } from 'fs/promises';
import { PassThrough } from "stream";

/**
 * Creates a folder and any necessary subfolders.
 * @param {string} dirPath - The path of the directory to create.
 */
export async function createFolderIfNotExists(dirPath: string) {
    try {
        await mkdir(dirPath, { recursive: true });
     } catch (error: any) {
        if (error instanceof Error) {
            console.error(`An error occurred: ${error.message}`);
            throw error;
        }
    }
}
