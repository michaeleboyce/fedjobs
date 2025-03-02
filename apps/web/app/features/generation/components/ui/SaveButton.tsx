import { FaSave } from 'react-icons/fa';
import { Button } from '@/app/shared/components/ui/Button';

interface SaveButtonProps {
  onClick: () => Promise<void>;
  isDisabled: boolean;
}

export function SaveButton({ onClick, isDisabled }: SaveButtonProps) {
  return (
    <Button
      variant="primary"
      onClick={onClick}
      disabled={isDisabled}
      leftIcon={<FaSave />}
      className="bg-green-600 hover:bg-green-700"
    >
      Save Document
    </Button>
  );
}