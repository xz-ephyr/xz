import { memo } from 'react';
import { MarkdownMessage } from './MarkdownMessage';
import type { TimelineSource } from './ThinkingTimeline';

interface StreamingContentProps {
  phase: string;
  content: string;
  contentBeforeTool?: string;
  contentAfterTool?: string;
  intentionLen: number;
  explanationLen: number;
  allSources: TimelineSource[];
}

export const StreamingContent = memo(({
  phase,
  content,
  contentBeforeTool,
  contentAfterTool,
  intentionLen,
  explanationLen,
  allSources,
}: StreamingContentProps) => {
  if (phase === 'idle') {
    return content ? (
      <div className="font-normal text-neutral-900 leading-[1.2]">
        <MarkdownMessage content={content} sources={allSources} />
      </div>
    ) : null;
  }

  return (
    <>
      {contentBeforeTool?.slice(0, intentionLen) && (
        <div className="font-normal text-neutral-900 stagger-item stagger-0 leading-[1.2]">
          <MarkdownMessage content={contentBeforeTool.slice(0, intentionLen)} sources={allSources} />
        </div>
      )}
      {(phase === 'explanation' || phase === 'done') && contentAfterTool?.slice(0, explanationLen) && (
        <div className="font-normal text-neutral-900 stagger-item stagger-2 leading-[1.2]">
          <MarkdownMessage content={contentAfterTool.slice(0, explanationLen)} sources={allSources} />
        </div>
      )}
    </>
  );
});
