// File path: apps/web/app/features/generation/components/DocumentInfo/ECQSelector.tsx
import { ECQ_NAMES } from '@fedjobs/utils';
import { ECQNamesType } from '@fedjobs/types';

interface ECQSelectorProps {
  selectedEcq: ECQNamesType | undefined;
  onChange: (ecq: ECQNamesType) => void;
}

export function ECQSelector({
  selectedEcq,
  onChange
}: ECQSelectorProps) {
  return (
    <select
      value={selectedEcq}
      onChange={(e) => onChange(e.target.value as ECQNamesType)}
      className="mb-4 w-full text-base p-2 border border-gray-300 rounded-md bg-white"
    >
      {Object.values(ECQ_NAMES).map((name) => (
        <option key={name} value={name}>
          {name}
        </option>
      ))}
    </select>
  );
}