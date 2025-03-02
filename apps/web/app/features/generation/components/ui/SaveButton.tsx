import { FaSave } from 'react-icons/fa';

interface SaveButtonProps {
  onClick: () => Promise<void>;
  isDisabled: boolean;
}

export function SaveButton({ onClick, isDisabled }: SaveButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={`px-4 py-2 rounded font-semibold flex items-center ${
        isDisabled
          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
          : 'bg-green-600 text-white hover:bg-green-700'
      }`}
    >
      <FaSave className="mr-2" /> Save Document
    </button>
  );
}