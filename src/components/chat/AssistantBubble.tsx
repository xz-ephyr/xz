import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MarkdownMessage } from './MarkdownMessage';
import {
  ThumbsUpIcon,
  ThumbsDownIcon,
  ArrowTurnBackwardIcon,
  Copy01Icon,
  Tick01Icon,
  Clock01Icon,
  PencilEdit01Icon,
  PencilEdit02Icon,
  File02Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArtifactPreviewCard } from '../artifacts/ArtifactPreviewCard';
import { HugeiconRenderer } from '../ui/HugeiconRenderer';
import { ToolCallPill } from './ToolCallPill';
import { ThoughtLabel } from './ThoughtLabel';

interface ArtifactCardData {
  title: string;
  type: string;
  artifactId: string;
  content?: string;
}

interface AssistantBubbleProps {
  content: string;
  isStreaming: boolean;
  model?: string;
  toolInvocations?: any[];
  reasoning?: string;
  artifactCards?: ArtifactCardData[];
  onArtifactClick?: (artifactId: string) => void;
  onCopy: () => void;
  onThumbsUp: () => void;
  onThumbsDown: () => void;
  onRegenerate: () => void;
}

export const AssistantBubble = React.memo(
  ({
    content,
    isStreaming,
    model,
    toolInvocations,
    reasoning,
    artifactCards,
    onArtifactClick,
    onCopy,
    onThumbsUp,
    onThumbsDown,
    onRegenerate,
  }: AssistantBubbleProps) => {
    const [isReasoningOpen, setIsReasoningOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
      onCopy();
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    const hasPendingTool = toolInvocations?.some((ti) => ti.state !== 'result');
    const showThinking = isStreaming && !content;

    const pendingTools = toolInvocations?.filter((ti) => ti.state !== 'result') || [];
    const artifactTool = toolInvocations?.find((ti) => ti.toolName === 'create_artifact');
    const intentMessage = artifactTool?.args?.intent_message;

    const showThought = !!reasoning;
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (isStreaming && scrollRef.current) {
        requestAnimationFrame(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }
        });
      }
    }, [reasoning, toolInvocations, isStreaming]);

    // Split reasoning into sentences for the 1-2 sentence intent constraint
    const sentences = useMemo(() => {
      if (!reasoning) return [];
      return reasoning
        .split(/(?<=[.!?])\s+/)
        .filter((s) => s.trim().length > 0)
        .slice(0, 50);
    }, [reasoning]);

    return (
      <div className="mb-6 w-full group/bubble">
        <div className="text-base px-4 py-4 break-words flex flex-col gap-2">
          {intentMessage && (
            <div className="font-medium text-neutral-800 mb-1">
              {intentMessage}
            </div>
          )}

          {hasPendingTool && (
            <div className="flex items-center gap-2 text-neutral-500">
              {pendingTools.map((ti) => {
                const fileName = ti.args?.file_path || ti.args?.path || ti.args?.title || ti.args?.filename || '';
                const toolIcon =
                  ti.toolName === 'write_file' || ti.toolName === 'create_artifact' ? <HugeiconsIcon icon={PencilEdit01Icon} size={13} className="text-neutral-400 shrink-0" /> :
                  ti.toolName === 'edit_file' ? <HugeiconsIcon icon={PencilEdit02Icon} size={13} className="text-neutral-400 shrink-0" /> :
                  ti.toolName === 'read_file' ? <HugeiconsIcon icon={File02Icon} size={13} className="text-neutral-400 shrink-0" /> :
                  null;
                return (
                  <div key={ti.toolCallId} className="flex items-center gap-1.5 px-2 py-1 bg-neutral-50 rounded-[6px] text-xs font-medium text-neutral-500 border border-neutral-200">
                    {toolIcon}
                    <span className="thinking-shimmer-text capitalize">
                      {ti.toolName === 'grep_tool' ? 'searching' :
                       ti.toolName === 'list_dir' ? 'browsing' :
                       ti.toolName === 'create_artifact' ? 'creating' :
                       ti.state === 'result' ? 'done' : 'running'}
                    </span>
                    {fileName && <span className="text-neutral-400 font-mono truncate max-w-[160px]">{fileName}</span>}
                  </div>
                );
              })}
            </div>
          )}

          {isStreaming && !reasoning && !hasPendingTool && !content && (
            <div className="flex items-center gap-2 text-neutral-400">
              <span className="text-sm">Thinking...</span>
            </div>
          )}

          {showThought && (
            <div className="flex flex-col gap-2">
              <ThoughtLabel
                isActivelyThinking={showThinking}
                isOpen={isReasoningOpen}
                onClick={() => setIsReasoningOpen(!isReasoningOpen)}
              />

              <div className="flex gap-3">
                {isReasoningOpen && (
                  <div className="flex flex-col items-center shrink-0">
                    <div className="flex items-center justify-center w-5 h-5">
                      <HugeiconsIcon icon={Clock01Icon} size={14} className="text-neutral-400" />
                    </div>
                    <div className="w-0.5 flex-1 min-h-4 bg-neutral-200 mt-1" />
                  </div>
                )}

                <div className="flex flex-col gap-2 flex-1 min-w-0">
                  <div
                    className={`grid ${isReasoningOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
                  >
                    <div className="overflow-hidden">
                      <div
                        ref={scrollRef}
                        className="overflow-y-auto no-scrollbar flex flex-col gap-2 pt-1"
                      >
                        {sentences.map((s, idx) => (
                          <div
                            key={idx}
                            className="text-[15px] leading-relaxed text-neutral-500"
                          >
                            {s}
                          </div>
                        ))}

                        {toolInvocations && toolInvocations.length > 0 && (
                          <div className="flex flex-wrap gap-2 pb-4 pt-2">
                            {toolInvocations.map((ti, idx) => (
                              <ToolCallPill
                                key={ti.toolCallId || idx}
                                toolName={ti.toolName}
                                state={ti.state}
                                args={ti.args}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {content && (
            <div className="font-normal text-neutral-900">
              <MarkdownMessage content={content} />
            </div>
          )}

          {artifactCards?.map((card) => (
            <ArtifactPreviewCard
              key={card.artifactId}
              title={card.title}
              type={card.type}
              content={card.content}
              onClick={() => onArtifactClick?.(card.artifactId)}
            />
          ))}
        </div>

        {!isStreaming && !hasPendingTool && (
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
            {model && (
              <span className="text-xs text-gray-400 ml-1">{model}</span>
            )}
          </div>
        )}
      </div>
    );
  }
);
