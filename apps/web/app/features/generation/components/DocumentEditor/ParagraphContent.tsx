import ReactMarkdown from 'react-markdown';

interface ParagraphContentProps {
  text: string;
}

export function ParagraphContent({ text }: ParagraphContentProps) {
  return (
    <ReactMarkdown components={{
      p: ({children}) => <p className="prose max-w-none">{children}</p>
    }}>
      {text}
    </ReactMarkdown>
  );
}