// File path: packages/crawler/src/scripts/clean-html.ts
import fs from 'fs/promises';
import path from 'path';
import { HtmlCleaner } from '../core/parser/HtmlCleaner';
import { Logger } from '../utils/Logger';

/**
 * Command-line utility to test the HTML cleaning functionality
 * Usage: npm run clean-html -- <path-to-html-file> [output-file]
 */
async function cleanHtmlFile(): Promise<void> {
  const logger = new Logger('CleanHtml');
  
  try {
    // Get command line arguments
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
      console.error('Error: Please provide a path to an HTML file.');
      console.error('Usage: npm run clean-html -- <path-to-html-file> [output-file]');
      process.exit(1);
    }
    
    const inputFilePath = args[0];
    const outputFilePath = args[1] || null;
    
    logger.info(`Processing file: ${inputFilePath}`);
    
    // Read the input file
    const htmlContent = await fs.readFile(inputFilePath, 'utf-8');
    logger.info(`Read ${htmlContent.length} bytes from input file`);
    
    // Create an instance of the HtmlCleaner
    const htmlCleaner = new HtmlCleaner();
    
    // Clean the HTML content
    logger.info('Cleaning HTML content...');
    const cleanedHtml = htmlCleaner.cleanHtml(htmlContent);
    logger.info(`Cleaned content is ${cleanedHtml.length} bytes (${((cleanedHtml.length / htmlContent.length) * 100).toFixed(2)}% of original)`);
    
    // Output the result
    if (outputFilePath) {
      await fs.writeFile(outputFilePath, cleanedHtml);
      logger.success(`Cleaned HTML written to ${outputFilePath}`);
    } else {
      // If no output file is specified, log to console
      console.log('\n----- CLEANED HTML OUTPUT -----\n');
      console.log(cleanedHtml);
      console.log('\n----- END OF OUTPUT -----\n');
    }
    
    logger.success('HTML cleaning completed successfully');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error && error.stack ? error.stack : 'No stack trace';
    
    logger.error(`Failed to process HTML file: ${errorMessage}`);
    logger.error(`Error details: ${errorStack}`);
    process.exit(1);
  }
}

// Execute the main function
cleanHtmlFile().catch(err => {
  console.error('Unhandled error in clean-html script:', err);
  process.exit(1);
});