import React, { useMemo, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ChevronsDownUpIcon, InternetIcon } from '@hugeicons/core-free-icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { deriveStepsFromParts } from '../../lib/timelineUtils';

const REMARK_PLUGINS = [remarkGfm];

export interface TimelineSource {
  url: string;
  title: string;
  snippet?: string;
}

export interface TimelineStep {
  id: string;
  type: 'thinking' | 'searching';
  reasoning?: string;
  query?: string;
  isRunning?: boolean;
  sources?: TimelineSource[];
  isActive: boolean;
}

interface ThinkingTimelineProps {
  steps: TimelineStep[];
  isStreaming: boolean;
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function SearchingHeader({ query, isRunning, onToggle }: { query: string; isRunning: boolean; onToggle?: () => void }) {
  return (
    <div
      className={`flex items-center gap-2 px-2 pr-3 py-0.5 rounded-[6px] cursor-pointer select-none transition-all active:scale-[0.98] group/searchheader ${
        isRunning ? 'bg-blue-50 active:bg-blue-100' : 'hover:bg-neutral-50 active:bg-neutral-100'
      }`}
      onClick={onToggle}
    >
      <div className="flex items-center justify-center w-5 h-5 shrink-0">
        <HugeiconsIcon icon={InternetIcon} size={12} className={isRunning ? 'text-blue-500' : 'text-neutral-400'} />
      </div>
      <span className={isRunning ? 'thinking-shimmer-text text-sm font-medium' : 'text-sm font-medium text-neutral-500'}>
        Searching
      </span>
      {query && <span className="text-sm font-medium text-neutral-600 truncate max-w-[400px]">&ldquo;{query}&rdquo;</span>}
      <HugeiconsIcon icon={ChevronsDownUpIcon} size={12} className="text-neutral-400 ml-auto opacity-0 group-hover/searchheader:opacity-100 transition-opacity cursor-pointer" />
    </div>
  );
}

export const ThinkingTimeline = React.memo(function ThinkingTimeline({ steps, isStreaming }: ThinkingTimelineProps) {
  const [expandedSearch, setExpandedSearch] = useState<Set<string>>(new Set());

  if (steps.length === 0) return null;

  return (
    <div className="flex flex-col gap-0">
      {steps.map((step) => {
        if (step.type === 'thinking') {
          const showEllipsis = step.isActive && isStreaming;
          return (
            <div key={step.id} className="flex">
              <div className="flex flex-col gap-1 flex-1 min-w-0 pb-3">
                <div className="text-[14px] leading-relaxed text-neutral-500 [&>p]:my-0">
                  <ReactMarkdown remarkPlugins={REMARK_PLUGINS}>{step.reasoning || ''}</ReactMarkdown>
                </div>
                {showEllipsis && <div className="text-[13px] leading-relaxed text-neutral-400 animate-pulse">...</div>}
              </div>
            </div>
          );
        }

        if (step.type === 'searching') {
          const isExpanded = expandedSearch.has(step.id);
          const toggleExpand = () => setExpandedSearch(prev => {
            const next = new Set(prev);
            if (next.has(step.id)) next.delete(step.id); else next.add(step.id);
            return next;
          });
          const sources = step.sources || [];

          return (
            <div key={step.id} className="pb-3">
              <SearchingHeader query={step.query || ''} isRunning={!!step.isRunning} onToggle={toggleExpand} />
              {step.isRunning && (
                <div className="flex items-center gap-1.5 px-2 text-xs text-neutral-400 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                  Fetching results...
                </div>
              )}
              {!step.isRunning && sources.length > 0 && (
                <div className={`grid transition-all duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                  <div className="overflow-hidden min-h-0">
                    <div className="border border-neutral-200 rounded-[6px] overflow-y-auto max-h-[240px] thin-scrollbar mx-[5px]">
                      {sources.map((src, sIdx) => (
                        <a key={sIdx} href={src.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-2 h-[36px] rounded-[6px] hover:bg-neutral-100 transition-colors no-underline">
                          <img src={`https://www.google.com/s2/favicons?domain=${getDomain(src.url)}&sz=16`} alt="" width={16} height={16} className="rounded shrink-0" />
                          <span className="text-sm text-neutral-700 truncate">{src.title || src.url}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        }
        return null;
      })}
    </div>
  );
});

export function useTimelineSteps(reasoning: string | undefined, toolInvocations: any[] | undefined, isStreaming: boolean, parts?: any[], hasContent?: boolean): TimelineStep[] {
  return useMemo(() => deriveStepsFromParts(parts, toolInvocations, isStreaming, !!hasContent, reasoning), [reasoning, toolInvocations, isStreaming, parts, hasContent]);
}

export function useAggregatedSources(toolInvocations: any[] | undefined): TimelineSource[] {
  return useMemo(() => {
    const seen = new Set<string>();
    const sources: TimelineSource[] = [];
    const searchTools = (toolInvocations || []).filter(ti => ti.toolName !== 'writeArtifact' && ti.state === 'result' && ti.result?.results);
    for (const ti of searchTools) {
      for (const r of ti.result.results) {
        if (r.url && !seen.has(r.url)) {
          seen.add(r.url);
          sources.push({ url: r.url, title: r.title || r.snippet || '', snippet: r.snippet });
        }
      }
    }
    return sources;
  }, [toolInvocations]);
}
