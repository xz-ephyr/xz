import React, { useState, useEffect, useRef, startTransition } from 'react';
import { MarkdownMessage } from './MarkdownMessage';
import {
  ThumbsUpIcon,
  ThumbsDownIcon,
  ArrowTurnBackwardIcon,
  Copy01Icon,
  Tick01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconRenderer } from '../ui/HugeiconRenderer';
import { ArtifactsPreviewCard } from './ArtifactsPreviewCard';
import { ThoughtLabel } from './ThoughtLabel';
import {
  ThinkingTimeline,
  useTimelineSteps,
  useAggregatedSources,
} from './ThinkingTimeline';
import type { TimelineSource } from './ThinkingTimeline';

interface AssistantBubbleProps {
  content: string;
  isStreaming: boolean;
  model?: string;
  toolInvocations?: any[];
  reasoning?: string;
  parts?: any[];
  artifacts?: any[];
  contentBeforeTool?: string;
  contentAfterTool?: string;
  onOpenArtifact?: (artifact: any) => void;
  onCopy: () => void;
  onThumbsUp: () => void;
  onThumbsDown: () => void;
  onRegenerate: () => void;
}

// ── Sources display component ──────────────────────────────────────

function SourcesFooter({ sources }: { sources: TimelineSource[] }) {
  const maxVisible = 4;
  const visible = sources.slice(0, maxVisible);
  const remaining = sources.length - maxVisible;

  if (sources.length === 0) return null;

  return (
    <div className="flex items-center" title="Sources used">
      {visible.map((src, i) => {
        let domain = '';
        try { domain = new URL(src.url).hostname.replace(/^www\./, ''); } catch { domain = src.url; }
        const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=16`;
        return (
          <a
            key={i}
            href={src.url}
            target="_blank"
            rel="noopener noreferrer"
            title={src.title || src.url}
            className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white hover:bg-neutral-100 
                       border border-neutral-200 transition-colors no-underline -ml-1 first:ml-0
                       shadow-sm hover:shadow-md"
          >
            <img src={faviconUrl} alt={domain} width={12} height={12} className="rounded" loading="lazy" />
          </a>
        );
      })}
      {remaining > 0 && (
        <span
          className="inline-flex items-center justify-center w-5 h-5 rounded-full -ml-1
                     bg-neutral-100 border border-neutral-200 
                     text-[10px] font-medium text-neutral-500 shrink-0"
          title={`${remaining} more source${remaining > 1 ? 's' : ''}`}
        >
          +{remaining}
        </span>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────

export const AssistantBubble = React.memo(
  ({
    content,
    isStreaming,
    model,
    toolInvocations,
    reasoning,
    parts,
    artifacts,
    contentBeforeTool,
    contentAfterTool,
    onOpenArtifact,
    onCopy,
    onThumbsUp,
    onThumbsDown,
    onRegenerate,
  }: AssistantBubbleProps) => {
    const [isReasoningOpen, setIsReasoningOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    const hasWriteArtifact = toolInvocations?.some((ti) => ti.toolName === 'writeArtifact');

    // ── Timeline steps (replaces old pill badges + reasoning panel) ──
    const timelineSteps = useTimelineSteps(reasoning, toolInvocations, isStreaming, parts, !!content);
    const hasTimeline = timelineSteps.length > 0;

    // ── Aggregated sources for footer ──
    const allSources = useAggregatedSources(toolInvocations);

    // ── Simulated streaming sequence (unchanged, for writeArtifact) ──
    const [phase, setPhase] = useState<'idle' | 'intention' | 'shimmer' | 'explanation' | 'done'>('idle');
    const [intentionLen, setIntentionLen] = useState(0);
    const [explanationLen, setExplanationLen] = useState(0);
    const prevIntentionRef = useRef('');
    const prevExplanationRef = useRef('');

    useEffect(() => {
      if (!hasWriteArtifact || !contentBeforeTool) return;
      if (phase === 'idle') {
        if (content && content.startsWith(contentBeforeTool)) {
          startTransition(() => setIntentionLen(contentBeforeTool.length));
          if (contentAfterTool && content.includes(contentAfterTool)) {
            startTransition(() => {
              setExplanationLen(contentAfterTool.length);
              setPhase('done');
            });
            return;
          }
          startTransition(() => setPhase('shimmer'));
          return;
        }
        startTransition(() => setPhase('intention'));
      }
    }, [hasWriteArtifact, contentBeforeTool, phase, content, contentAfterTool]);

    useEffect(() => {
      if (phase !== 'intention' || !contentBeforeTool) return;
      const total = contentBeforeTool.length;
      if (total === 0) { startTransition(() => setPhase('shimmer')); return; }
      if (intentionLen >= total) { startTransition(() => setPhase('shimmer')); return; }
      if (contentBeforeTool !== prevIntentionRef.current && prevIntentionRef.current !== '') {
        prevIntentionRef.current = contentBeforeTool;
        startTransition(() => setIntentionLen(total));
        return;
      }
      prevIntentionRef.current = contentBeforeTool;
      const step = Math.max(1, Math.floor(total / 60));
      const t = setTimeout(() => setIntentionLen(l => Math.min(l + step, total)), 25);
      return () => clearTimeout(t);
    }, [phase, contentBeforeTool, intentionLen]);

    useEffect(() => {
      if (phase !== 'shimmer') return;
      startTransition(() => setExplanationLen(0));
      const t = setTimeout(() => setPhase('explanation'), 600);
      return () => clearTimeout(t);
    }, [phase]);

    useEffect(() => {
      if (phase !== 'explanation' || !contentAfterTool) return;
      const total = contentAfterTool.length;
      if (total === 0) { startTransition(() => setPhase('done')); return; }
      if (explanationLen >= total) { startTransition(() => setPhase('done')); return; }
      if (contentAfterTool !== prevExplanationRef.current && prevExplanationRef.current !== '') {
        prevExplanationRef.current = contentAfterTool;
        startTransition(() => setExplanationLen(total));
        return;
      }
      prevExplanationRef.current = contentAfterTool;
      const step = Math.max(1, Math.floor(total / 60));
      const t = setTimeout(() => setExplanationLen(l => Math.min(l + step, total)), 25);
      return () => clearTimeout(t);
    }, [phase, contentAfterTool, explanationLen]);

    const streamedIntention = contentBeforeTool?.slice(0, intentionLen) || '';
    const streamedExplanation = contentAfterTool?.slice(0, explanationLen) || '';

    const handleCopy = () => {
      onCopy();
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    const hasPendingSearch = toolInvocations?.some(
      (ti) => ti.toolName !== 'writeArtifact' && ti.state !== 'result',
    );
    const showFooterActions = !isStreaming && !hasPendingSearch;

    const timelineScrollRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
      if (isStreaming && timelineScrollRef.current) {
        requestAnimationFrame(() => {
          timelineScrollRef.current?.scrollTo(0, timelineScrollRef.current.scrollHeight);
        });
      }
    }, [reasoning, toolInvocations, isStreaming]);

  return (
    <div className="mb-6 w-full group/bubble">
      <div className="text-base px-4 break-words flex flex-col gap-0">
        {/* ── Thinking label + timeline inside expandable panel ── */}
        {hasTimeline && (
          <>
            <ThoughtLabel
              isActivelyThinking={isStreaming && !hasPendingSearch && !content}
              isOpen={isReasoningOpen}
              onClick={() => setIsReasoningOpen((p) => !p)}
            />

            <div
              className={`grid ${
                isReasoningOpen
                  ? 'grid-rows-[1fr] opacity-100'
                  : 'grid-rows-[0fr] opacity-0'
              }`}
            >
              <div className="overflow-hidden min-h-0">
                <div
                  ref={timelineScrollRef}
                  className="overflow-y-auto no-scrollbar flex flex-col gap-2 max-h-[45vh]"
                >
                  <ThinkingTimeline
                    steps={timelineSteps}
                    isStreaming={isStreaming}
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── Write artifact streaming sequence ── */}
        {phase !== 'idle' ? (
          <>
            {streamedIntention && (
              <div className="font-normal text-neutral-900 stagger-item stagger-0 leading-[1.2]">
                <MarkdownMessage content={streamedIntention} sources={allSources} />
              </div>
            )}
            {(phase === 'explanation' || phase === 'done') && streamedExplanation && (
              <div className="font-normal text-neutral-900 stagger-item stagger-2 leading-[1.2]">
                <MarkdownMessage content={streamedExplanation} sources={allSources} />
              </div>
            )}
          </>
        ) : content && (
          <div className="font-normal text-neutral-900 leading-[1.2]">
            <MarkdownMessage content={content} sources={allSources} />
          </div>
        )}
      </div>

      {artifacts && artifacts.length > 0 && !isStreaming && onOpenArtifact && (
        <div className="px-4 pb-2">
          <ArtifactsPreviewCard
            artifact={artifacts[0]}
            onClick={() => onOpenArtifact(artifacts[0])}
          />
        </div>
      )}

      {showFooterActions && (
        <div className="flex items-center gap-3 text-gray-600 px-4">
          <button
            type="button"
            onClick={handleCopy}
            className="hover:text-black transition-colors"
            title={copied ? 'Copied!' : 'Copy response'}
            aria-label={copied ? 'Copied!' : 'Copy response'}
          >
            <HugeiconRenderer
              icon={copied ? Tick01Icon : Copy01Icon}
              size={18}
              className={copied ? 'text-green-600' : ''}
            />
          </button>
          <button
            type="button"
            onClick={onThumbsUp}
            className="hover:text-black transition-colors"
            title="Good response"
            aria-label="Good response"
          >
            <HugeiconRenderer icon={ThumbsUpIcon} size={18} />
          </button>
          <button
            type="button"
            onClick={onThumbsDown}
            className="hover:text-black transition-colors"
            title="Bad response"
            aria-label="Bad response"
          >
            <HugeiconRenderer icon={ThumbsDownIcon} size={18} />
          </button>
          <button
            type="button"
            onClick={onRegenerate}
            className="hover:text-black transition-colors"
            title="Regenerate response"
            aria-label="Regenerate response"
          >
            <HugeiconRenderer icon={ArrowTurnBackwardIcon} size={18} />
          </button>

          {/* ── Sources ── */}
          {allSources.length > 0 && (
            <>
              <div className="w-px h-5 bg-neutral-200 mx-1" />
              <SourcesFooter sources={allSources} />
            </>
          )}

          {model && (
            <span className="text-xs text-gray-400">{model}</span>
          )}
        </div>
      )}
    </div>
  );
  }
);
