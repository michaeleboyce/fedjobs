// File path: apps/web/app/features/generation/components/DocumentInfo/DocumentTypeSelector.tsx
import { DOCUMENT_TYPES } from '@fedjobs/utils';
import { getPrettyPrintType } from '@/app/shared/utils/Constants';

interface DocumentTypeSelectorProps {
  selectedType: string;
  onChange: (type: string) => void;
}

export function DocumentTypeSelector({
  selectedType,
  onChange
}: DocumentTypeSelectorProps) {
  return (
    <select
      value={selectedType}
      onChange={(e) => onChange(e.target.value)}
      className="mb-4 w-full text-base p-2 border border-gray-300 rounded-md bg-white"
    >
      {DOCUMENT_TYPES.map((type) => (
        <option key={type} value={type}>
          {getPrettyPrintType(type)}
        </option>
      ))}
    </select>
  );
}