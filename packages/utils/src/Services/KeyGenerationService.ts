// File path: packages/utils/src/Services/KeyGenerationService.ts
export function generateKeyFromFileName(fileName: string): string {
    // Extract extension if it exists
    const lastDotIndex = fileName.lastIndexOf('.');
    const nameWithoutExtension = lastDotIndex !== -1 ? fileName.slice(0, lastDotIndex) : fileName;
    const extension = lastDotIndex !== -1 ? fileName.slice(lastDotIndex) : '';

    // Get current date components
    const now = new Date();
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const day = now.getDate().toString().padStart(2, "0");
    const year = now.getFullYear().toString().substring(2);
    const hours = now.getHours().toString().padStart(2, "0");
    const minutes = now.getMinutes().toString().padStart(2, "0");
    const seconds = now.getSeconds().toString().padStart(2, "0");

    // Generate random alphanumeric string (6 characters)
    const randomString = Math.random().toString(36).substring(2, 8);

    // Check if the filename already contains a date in MM-DD-YY format
    const dateRegex = /\d{2}-\d{2}-\d{2}/;
    const hasDate = dateRegex.test(nameWithoutExtension);

    // Build the new filename
    const datePart = hasDate ? '' : `-${month}-${day}-${year}`;
    const timePart = `-${hours}-${minutes}-${seconds}`;
    const uniquePart = `-${randomString}`;

    return `${nameWithoutExtension}${datePart}${timePart}${uniquePart}${extension}`;
}
  