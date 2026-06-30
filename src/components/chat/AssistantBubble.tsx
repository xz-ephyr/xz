import React, { memo, useRef, useEffect } from 'react';
import { ThumbsUpIcon, ThumbsDownIcon, ArrowTurnBackwardIcon, Copy01Icon, Tick01Icon } from '@hugeicons/core-free-icons';
import { HugeiconRenderer } from '../ui/HugeiconRenderer';
import { ArtifactsPreviewCard } from './ArtifactsPreviewCard';
import { ThoughtLabel } from './ThoughtLabel';
import { ThinkingTimeline, useTimelineSteps, useAggregatedSources } from './ThinkingTimeline';
import { SourcesFooter } from './SourcesFooter';
import { StreamingContent } from './StreamingContent';
import { useWriteArtifactStreaming } from '../../hooks/useWriteArtifactStreaming';

interface AssistantBubbleProps { content: string; isStreaming: boolean; model?: string; toolInvocations?: any[]; reasoning?: string; parts?: any[]; artifacts?: any[]; contentBeforeTool?: string; contentAfterTool?: string; onOpenArtifact?: (artifact: any) => void; onCopy: () => void; onThumbsUp: () => void; onThumbsDown: () => void; onRegenerate: () => void; }

export const AssistantBubble = memo(({ content, isStreaming, model, toolInvocations, reasoning, parts, artifacts, contentBeforeTool, contentAfterTool, onOpenArtifact, onCopy, onThumbsUp, onThumbsDown, onRegenerate }: AssistantBubbleProps) => {
  const [isReasoningOpen, setIsReasoningOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const hasWriteArtifact = toolInvocations?.some(ti => ti.toolName === 'writeArtifact') ?? false;
  const timelineSteps = useTimelineSteps(reasoning, toolInvocations, isStreaming, parts, !!content);
  const allSources = useAggregatedSources(toolInvocations);
  const { phase, intentionLen, explanationLen } = useWriteArtifactStreaming(hasWriteArtifact, content, contentBeforeTool, contentAfterTool);
  const hasPendingSearch = toolInvocations?.some(ti => ti.toolName !== 'writeArtifact' && ti.state !== 'result');
  const timelineScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (isStreaming && timelineScrollRef.current) requestAnimationFrame(() => timelineScrollRef.current?.scrollTo(0, timelineScrollRef.current.scrollHeight)); }, [reasoning, toolInvocations, isStreaming]);

  return (
    <div className="mb-6 w-full group/bubble">
      <div className="text-base px-4 break-words flex flex-col gap-0">
        {timelineSteps.length > 0 && <>
          <ThoughtLabel isActivelyThinking={isStreaming && !hasPendingSearch && !content} isOpen={isReasoningOpen} onClick={() => setIsReasoningOpen(p => !p)} />
          <div className={`grid ${isReasoningOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
            <div className="overflow-hidden min-h-0"><div ref={timelineScrollRef} className="overflow-y-auto no-scrollbar flex flex-col gap-2 max-h-[45vh]"><ThinkingTimeline steps={timelineSteps} isStreaming={isStreaming} /></div></div>
          </div>
        </>}
        <StreamingContent phase={phase} content={content} contentBeforeTool={contentBeforeTool} contentAfterTool={contentAfterTool} intentionLen={intentionLen} explanationLen={explanationLen} allSources={allSources} />
      </div>
      {artifacts?.[0] && !isStreaming && onOpenArtifact && <div className="px-4 pb-2"><ArtifactsPreviewCard artifact={artifacts[0]} onClick={() => onOpenArtifact(artifacts[0])} /></div>}
      {!isStreaming && !hasPendingSearch && <AssistantActions model={model} copied={copied} onCopy={() => { onCopy(); setCopied(true); setTimeout(() => setCopied(false), 2000); }} onThumbsUp={onThumbsUp} onThumbsDown={onThumbsDown} onRegenerate={onRegenerate} sources={allSources} />}
    </div>
  );
});

const AssistantActions = memo(({ model, copied, onCopy, onThumbsUp, onThumbsDown, onRegenerate, sources }: any) => (
  <div className="flex items-center gap-3 text-gray-600 px-4">
    <ActionButton onClick={onCopy} icon={copied ? Tick01Icon : Copy01Icon} title={copied ? 'Copied!' : 'Copy'} className={copied ? 'text-green-600' : ''} />
    <ActionButton onClick={onThumbsUp} icon={ThumbsUpIcon} title="Good" />
    <ActionButton onClick={onThumbsDown} icon={ThumbsDownIcon} title="Bad" />
    <ActionButton onClick={onRegenerate} icon={ArrowTurnBackwardIcon} title="Regenerate" />
    {sources.length > 0 && <><div className="w-px h-5 bg-neutral-200 mx-1" /><SourcesFooter sources={sources} /></>}
    {model && <span className="text-xs text-gray-400">{model}</span>}
  </div>
));

const ActionButton = ({ onClick, icon, title, className = '' }: any) => (
  <button type="button" onClick={onClick} className={`hover:text-black transition-colors ${className}`} title={title} aria-label={title}><HugeiconRenderer icon={icon} size={18} /></button>
);
