import React from 'react';
import ReactMarkdown from 'react-markdown';

interface ParagraphContentProps {
  text: string;
}

/**
 * Component for displaying the paragraph content with markdown formatting
 */
const ParagraphContent: React.FC<ParagraphContentProps> = ({ text }) => {
  return (
    <ReactMarkdown components={{
      p: ({children}) => <p className="prose max-w-none">{children}</p>
    }}>
      {text}
    </ReactMarkdown>
  );
};

export default ParagraphContent;