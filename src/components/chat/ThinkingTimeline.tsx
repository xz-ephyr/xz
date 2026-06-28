import { useMemo, useRef, useEffect, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Clock01Icon, InternetIcon } from '@hugeicons/core-free-icons';
import { useThinkingTimer } from '../../hooks/useThinkingTimer';

// ── Types ──────────────────────────────────────────────────────────

export interface TimelineSource {
  url: string;
  title: string;
}

export interface TimelineStep {
  id: string;
  type: 'thinking' | 'searching';
  /** For thinking: the full reasoning text so far */
  reasoning?: string;
  /** For searching: the search query */
  query?: string;
  /** For searching: whether the search is still running */
  isRunning?: boolean;
  /** For searching: source URLs from completed results */
  sources?: TimelineSource[];
  /** Whether this step is the currently active one (receiving updates) */
  isActive: boolean;
}

interface ThinkingTimelineProps {
  steps: TimelineStep[];
  isReasoningOpen: boolean;
  onToggleReasoning: () => void;
  isStreaming: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function SourcePill({ url, title }: { url: string; title?: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={title || url}
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-neutral-100 hover:bg-neutral-200 
                 border border-neutral-200 text-xs text-neutral-600 hover:text-neutral-800 
                 transition-colors no-underline shrink-0 max-w-[160px]"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 shrink-0" />
      <span className="truncate">{getDomain(url)}</span>
    </a>
  );
}

// ── Sub-components ─────────────────────────────────────────────────

function ThinkingHeader({
  isActivelyThinking,
  isOpen,
  onClick,
}: {
  isActivelyThinking: boolean;
  isOpen: boolean;
  onClick: () => void;
}) {
  const { label } = useThinkingTimer(isActivelyThinking);

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center bg-transparent p-0 text-left outline-none w-fit transition-all"
      aria-expanded={isOpen}
    >
      <span
        className={
          isActivelyThinking
            ? 'thinking-shimmer-text text-sm font-medium cursor-pointer'
            : 'text-sm font-medium text-neutral-500 cursor-pointer'
        }
      >
        {label}
      </span>
    </button>
  );
}

function SearchingHeader({
  query,
  isRunning,
}: {
  query: string;
  isRunning: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={
          isRunning
            ? 'thinking-shimmer-text text-sm font-medium'
            : 'text-sm font-medium text-neutral-500'
        }
      >
        Searching
      </span>
      {query && (
        <span className="text-sm text-neutral-400 truncate max-w-[320px]">
          &ldquo;{query}&rdquo;
        </span>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────

export function ThinkingTimeline({
  steps,
  isReasoningOpen,
  onToggleReasoning,
  isStreaming,
}: ThinkingTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [expandedSearch, setExpandedSearch] = useState<Set<string>>(new Set());

  // Auto-scroll reasoning during streaming
  useEffect(() => {
    if (isStreaming && scrollRef.current) {
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      });
    }
  }, [steps, isStreaming]);

  // Split reasoning into sentences (same as current AssistantBubble logic)
  const sentences = useMemo(() => {
    const thinkingStep = steps.find((s) => s.type === 'thinking');
    if (!thinkingStep?.reasoning) return [];
    return thinkingStep.reasoning
      .split(/(?<=[.!?])\s+/)
      .filter((s) => s.trim().length > 0)
      .slice(0, 50);
  }, [steps]);

  const hasAnyStep = steps.length > 0;

  if (!hasAnyStep) return null;

  return (
    <div className="flex flex-col gap-0">
      {steps.map((step, idx) => {
        const isLast = idx === steps.length - 1;

        if (step.type === 'thinking') {
          return (
            <div key={step.id} className="flex gap-3">
              {/* Left gutter: icon + line */}
              <div className="flex flex-col items-center shrink-0">
                <div className="flex items-center justify-center w-5 h-5">
                  <HugeiconsIcon icon={Clock01Icon} size={14} className="text-neutral-400" />
                </div>
                {!isLast && <div className="w-0.5 flex-1 min-h-4 bg-neutral-200 mt-1" />}
              </div>

              {/* Right: header + content */}
              <div className="flex flex-col gap-2 flex-1 min-w-0 pb-3">
                <ThinkingHeader
                  isActivelyThinking={step.isActive && isStreaming}
                  isOpen={isReasoningOpen}
                  onClick={onToggleReasoning}
                />

                <div
                  className={`grid ${
                    isReasoningOpen
                      ? 'grid-rows-[1fr] opacity-100'
                      : 'grid-rows-[0fr] opacity-0'
                  }`}
                >
                  <div className="overflow-hidden">
                    <div
                      ref={scrollRef}
                      className="overflow-y-auto no-scrollbar flex flex-col gap-2 pt-1 max-h-[45vh]"
                    >
                      {sentences.map((s, sIdx) => (
                        <div
                          key={sIdx}
                          className="text-[15px] leading-relaxed text-neutral-500"
                        >
                          {s}
                        </div>
                      ))}
                      {step.isActive && isStreaming && (
                        <div className="text-[15px] leading-relaxed text-neutral-400 animate-pulse">
                          ...
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        }

        if (step.type === 'searching') {
          const isExpanded = expandedSearch.has(step.id);
          const sources = step.sources || [];
          const showSources = !step.isRunning && sources.length > 0;
          const maxVisibleSources = 4;

          const toggleExpand = () => {
            setExpandedSearch((prev) => {
              const next = new Set(prev);
              if (next.has(step.id)) {
                next.delete(step.id);
              } else {
                next.add(step.id);
              }
              return next;
            });
          };

          return (
            <div key={step.id} className="flex gap-3">
              {/* Left gutter: icon + line */}
              <div className="flex flex-col items-center shrink-0">
                <div className="flex items-center justify-center w-5 h-5">
                  <HugeiconsIcon
                    icon={InternetIcon}
                    size={14}
                    className={step.isRunning ? 'text-blue-500' : 'text-neutral-400'}
                  />
                </div>
                {!isLast && <div className="w-0.5 flex-1 min-h-4 bg-neutral-200 mt-1" />}
              </div>

              {/* Right: header + sources */}
              <div className="flex flex-col gap-2 flex-1 min-w-0 pb-3">
                <SearchingHeader query={step.query || ''} isRunning={!!step.isRunning} />

                {/* Sources row */}
                {step.isRunning && (
                  <div className="flex items-center gap-1.5 text-xs text-neutral-400 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                    Fetching results...
                  </div>
                )}

                {showSources && (
                  <>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {sources.slice(0, maxVisibleSources).map((src, sIdx) => (
                        <SourcePill
                          key={`${step.id}-${sIdx}`}
                          url={src.url}
                          title={src.title}
                        />
                      ))}
                      {sources.length > maxVisibleSources && (
                        <button
                          type="button"
                          onClick={toggleExpand}
                          className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-neutral-100 
                                   border border-neutral-200 text-xs font-medium text-neutral-500 
                                   hover:bg-neutral-200 transition-colors shrink-0"
                          title={isExpanded ? 'Show less' : `Show ${sources.length - maxVisibleSources} more sources`}
                        >
                          {isExpanded
                            ? `-${sources.length - maxVisibleSources}`
                            : `+${sources.length - maxVisibleSources}`}
                        </button>
                      )}
                    </div>

                    {/* Expanded sources */}
                    {isExpanded && sources.length > maxVisibleSources && (
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        {sources.slice(maxVisibleSources).map((src, sIdx) => (
                          <SourcePill
                            key={`${step.id}-exp-${sIdx}`}
                            url={src.url}
                            title={src.title}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}

// ── Hook to build timeline steps from raw props ────────────────────

/**
 * Derives a chronologically-ordered array of TimelineSteps from the
 * reasoning text and tool invocations.
 *
 * Simple approach:
 * - One "thinking" step at the beginning (all reasoning text)
 * - One "searching" step per search-related tool invocation
 */
export function useTimelineSteps(
  reasoning: string | undefined,
  toolInvocations: any[] | undefined,
  isStreaming: boolean,
): TimelineStep[] {
  return useMemo(() => {
    const steps: TimelineStep[] = [];

    const searchTools = (toolInvocations || []).filter(
      (ti) => ti.toolName !== 'writeArtifact',
    );

    const hasReasoning = !!reasoning;
    const hasSearchTools = searchTools.length > 0;

    if (!hasReasoning && !hasSearchTools) {
      return steps;
    }

    // 1. Thinking step (all reasoning accumulated so far)
    if (hasReasoning) {
      const hasRunningSearch = searchTools.some((ti) => ti.state !== 'result');
      const isActivelyThinking = isStreaming && !hasRunningSearch;

      steps.push({
        id: 'thinking',
        type: 'thinking',
        reasoning,
        isActive: isActivelyThinking,
      });
    }

    // 2. Search steps (in order of appearance)
    searchTools.forEach((ti) => {
      const sources: TimelineSource[] = [];
      if (ti.state === 'result' && ti.result?.results) {
        for (const r of ti.result.results) {
          if (r.url) {
            sources.push({ url: r.url, title: r.title || r.snippet || '' });
          }
        }
      }

      steps.push({
        id: ti.toolCallId || `search-${steps.length}`,
        type: 'searching',
        query: ti.args?.query || ti.args?.url || '',
        isRunning: ti.state !== 'result',
        sources,
        isActive: ti.state !== 'result',
      });
    });

    return steps;
  }, [reasoning, toolInvocations, isStreaming]);
}

// ── Hook to aggregate all sources from completed searches ──────────

export function useAggregatedSources(
  toolInvocations: any[] | undefined,
): TimelineSource[] {
  return useMemo(() => {
    const seen = new Set<string>();
    const sources: TimelineSource[] = [];

    const searchTools = (toolInvocations || []).filter(
      (ti) => ti.toolName !== 'writeArtifact' && ti.state === 'result' && ti.result?.results,
    );

    for (const ti of searchTools) {
      for (const r of ti.result.results) {
        if (r.url && !seen.has(r.url)) {
          seen.add(r.url);
          sources.push({ url: r.url, title: r.title || r.snippet || '' });
        }
      }
    }

    return sources;
  }, [toolInvocations]);
}
