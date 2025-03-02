// File path: apps/web/app/shared/utils/classNames.ts
/**
 * Utility for conditionally joining Tailwind CSS classes together
 * Inspired by the clsx and classnames libraries
 * 
 * @param inputs - Classes or conditional classes to be joined together
 */
export function cn(...inputs: (string | boolean | undefined | null)[]): string {
  return inputs
    .filter(Boolean) // Filter out falsy values
    .join(' ')
    .trim()
    .replace(/\s+/g, ' '); // Replace multiple spaces with a single space
}