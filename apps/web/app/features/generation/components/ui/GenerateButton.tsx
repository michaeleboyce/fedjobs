import { useState } from 'react';

interface GenerateButtonProps {
  onClick: () => Promise<void>;
  isDisabled: boolean;
}

export function GenerateButton({ onClick, isDisabled }: GenerateButtonProps) {
  const [generateStatus, setGenerateStatus] = useState('');

  const handleGenerateClick = async () => {
    setGenerateStatus('Generating');
    
    let dotCount = 0;
    const interval = setInterval(() => {
      dotCount = (dotCount + 1) % 4;
      setGenerateStatus(`Generating${'.'.repeat(dotCount)}`);
    }, 500);

    try {
      await onClick();
    } catch (error) {
      console.error('An error occurred during generation:', error);
    } finally {
      clearInterval(interval);
      setGenerateStatus('');
    }
  };

  return (
    <button 
      className={`px-4 py-2 rounded font-semibold ${
        isDisabled
          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
          : 'bg-blue-600 text-white hover:bg-blue-700'
      }`}
      onClick={handleGenerateClick} 
      disabled={isDisabled || !!generateStatus}
    >
      {generateStatus || 'Generate'}
    </button>
  );
}