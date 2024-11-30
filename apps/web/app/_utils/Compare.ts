export type AsyncCompareMethod<T> = (other: T) => Promise<boolean>;

export async function queryChatGPTForComparison(text1: string, text2: string): Promise<boolean> {
    // Hypothetical function to send a query to ChatGPT
    // For demonstration purposes, we'll randomly return true or false
    return Math.random() > 0.5; // Replace with actual ChatGPT API query logic
}