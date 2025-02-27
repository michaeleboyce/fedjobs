// File path: apps/web/app/_utils/fileHelpers.ts
import { mkdir } from 'fs/promises';
import { PassThrough } from "stream";

/**
 * Creates a folder and any necessary subfolders.
 * @param {string} dirPath - The path of the directory to create.
 */
export async function createFolderIfNotExists(dirPath: string) {
    try {
        await mkdir(dirPath, { recursive: true });
        console.log(`Directory created successfully: ${dirPath}`);
     } catch (error: any) {
        if (error instanceof Error) {
            console.error(`An error occurred: ${error.message}`);
            throw error;
        }
    }
}
