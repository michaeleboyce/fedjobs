// File path: apps/web/app/features/generation/components/DocumentInfo/LengthSelector.tsx
import { useState, useEffect } from 'react';

interface LengthSelectorProps {
  length: number;
  lengthUnit: 'words' | 'pages';
  onLengthChange: (length: number) => void;
  onLengthUnitChange: (unit: 'words' | 'pages') => void;
}

export function LengthSelector({
  length,
  lengthUnit,
  onLengthChange,
  onLengthUnitChange
}: LengthSelectorProps) {
  const [lengthInput, setLengthInput] = useState<string>(length.toString());
  
  // Update lengthInput when length prop changes
  useEffect(() => {
    setLengthInput(length.toString());
  }, [length]);
  
  // Get maximum allowed length based on unit
  const getMaxLength = (unit: "words" | "pages"): number => {
    return unit === "words" ? 5000 : 100;
  };
  
  // Handle length change
  const handleLengthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLengthInput(e.target.value);
  };
  
  // Handle blur event (validate and update)
  const handleLengthBlur = () => {
    const value = parseInt(lengthInput, 10);
    
    if (!isNaN(value) && value > 0 && value <= getMaxLength(lengthUnit)) {
      onLengthChange(value);
    } else if (lengthInput === "") {
      // Keep empty for now
    } else {
      // Reset to default if invalid
      const defaultLength = lengthUnit === "words" ? 500 : 2;
      onLengthChange(defaultLength);
      setLengthInput(defaultLength.toString());
      alert(`Please enter a valid number of ${lengthUnit}.`);
    }
  };

  return (
    <div>
      <h4 className="text-md font-semibold mb-4">Document Length</h4>
      <div className="flex items-center mb-4">
        <input
          type="number"
          value={lengthInput}
          onChange={handleLengthChange}
          onBlur={handleLengthBlur}
          placeholder="Length"
          min={1}
          max={getMaxLength(lengthUnit)}
          className="mr-2 w-24 text-base p-2 border border-gray-300 rounded-md bg-white"
        />
        <select
          value={lengthUnit}
          onChange={(e) => onLengthUnitChange(e.target.value as 'words' | 'pages')}
          className="w-32 text-base p-2 border border-gray-300 rounded-md bg-white"
        >
          <option value="words">Words</option>
          <option value="pages">Pages</option>
        </select>
      </div>
    </div>
  );
}