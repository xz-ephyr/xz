import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownPreviewProps {
  content: string;
}

export const MarkdownPreview = memo(function MarkdownPreview({ content }: MarkdownPreviewProps) {
  return (
    <div className="prose prose-neutral max-w-none p-6 text-sm">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  );
});
