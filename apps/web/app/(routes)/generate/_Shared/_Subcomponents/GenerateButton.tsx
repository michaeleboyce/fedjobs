// File path: apps/web/app/(routes)/generate/_Components/_Subcomponents/GenerateButton.tsx
import React, { useState } from 'react';

interface GenerateButtonProps {
  onClick: () => Promise<void>; // Expect onClick to return a Promise
  isDisabled: boolean;
}

const GenerateButton: React.FC<GenerateButtonProps> = ({ onClick, isDisabled }) => {
  const [generateStatus, setGenerateStatus] = useState('');

  const handleGenerateClick = async () => {
    setGenerateStatus('Generating');
    let dotCount = 0;
    const interval = setInterval(() => {
      dotCount = (dotCount + 1) % 4;
      setGenerateStatus(`Generating${'.'.repeat(dotCount)}`);
    }, 500);

    try {
      await onClick(); // Wait for the onClick operation to complete
    } catch (error) {
      console.error('An error occurred:', error);
      // Handle any errors from the onClick operation
    } finally {
      clearInterval(interval);
      setGenerateStatus('');
    }
  };


  return (
      <button 
        className="generate-button" 
        onClick={handleGenerateClick} 
        disabled={isDisabled}
      >
        {generateStatus || 'Generate'}
      </button>
  );
};

export default GenerateButton;
