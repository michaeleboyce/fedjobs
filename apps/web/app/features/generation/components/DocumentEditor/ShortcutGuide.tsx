// Create a new component app/features/generation/components/DocumentEditor/ShortcutGuide.tsx
import React from 'react';
import { Key } from './Key';

interface Shortcut {
  key: string;
  description: string;
}

interface ShortcutGuideProps {
  isVisible: boolean;
  onClose: () => void;
}

export function ShortcutGuide({ isVisible, onClose }: ShortcutGuideProps) {
  const shortcuts: Shortcut[] = [
    { key: '↑', description: 'Navigate to previous paragraph' },
    { key: '↓', description: 'Navigate to next paragraph' },
    { key: 'E', description: 'Edit selected paragraph' },
    { key: 'R', description: 'Regenerate selected paragraph' },
    { key: 'D', description: 'Delete selected paragraph' },
    { key: 'PageUp', description: 'Move paragraph up' },
    { key: 'PageDown', description: 'Move paragraph down' },
    { key: 'Ctrl+S', description: 'Save document' },
  ];

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Keyboard Shortcuts</h3>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ×
          </button>
        </div>
        
        <div className="space-y-2">
          {shortcuts.map((shortcut) => (
            <div key={shortcut.key} className="flex items-center">
              <Key>{shortcut.key}</Key>
              <span className="ml-3">{shortcut.description}</span>
            </div>
          ))}
        </div>
        
        <div className="mt-6 text-sm text-gray-500">
          Note: Select a paragraph first to use these shortcuts
        </div>
      </div>
    </div>
  );
}

