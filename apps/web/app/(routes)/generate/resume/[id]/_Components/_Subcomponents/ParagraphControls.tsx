// File path: apps/web/app/(routes)/generate/resume/[id]/_Components/_Subcomponents/ParagraphControls.tsx
import React from 'react';

type ParagraphControlsProps = {
    index: number;
    onMoveParagraph: (index: number, direction: 'up' | 'down') => void;
};

 export const ParagraphControls: React.FC<ParagraphControlsProps> = ({ index, onMoveParagraph }) => (
    <div className="paragraph-controls">
        <button onClick={(e) => {
            e.stopPropagation();
            onMoveParagraph(index, 'up');
        }}>
            ↑
        </button>
        <button onClick={(e) => {
            e.stopPropagation();
            onMoveParagraph(index, 'down');
        }}>
            ↓
        </button>
    </div>
);

