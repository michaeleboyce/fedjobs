import { useEffect } from 'react';

/**
 * Custom hook for auto-resizing textareas based on content
 * @param textAreaRef Reference to the textarea element
 * @param value The text content of the textarea
 */
export const useAutosizeTextArea = (
  textAreaRef: React.RefObject<HTMLTextAreaElement>,
  value: string
) => {
  useEffect(() => {
    if (textAreaRef.current) {
      // Reset height to ensure accurate scrollHeight measurement
      textAreaRef.current.style.height = "auto";
      
      // Set the height to scrollHeight to expand based on content
      const scrollHeight = textAreaRef.current.scrollHeight;
      textAreaRef.current.style.height = `${scrollHeight}px`;
    }
  }, [textAreaRef, value]);
};

export default useAutosizeTextArea;