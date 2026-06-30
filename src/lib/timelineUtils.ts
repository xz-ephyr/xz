import type { TimelineStep, TimelineSource } from '../components/chat/ThinkingTimeline';

export function deriveStepsFromParts(
  parts: any[] | undefined,
  toolInvocations: any[] | undefined,
  isStreaming: boolean,
  hasContent: boolean,
  reasoning?: string
): TimelineStep[] {
  const steps: TimelineStep[] = [];
  if (!parts || !Array.isArray(parts) || parts.length === 0) {
    return deriveFallbackSteps(reasoning || '', toolInvocations, isStreaming, hasContent);
  }

  let reasoningBuf: string[] = [];
  let stepId = 0;

  const flushReasoning = (isActive: boolean) => {
    if (reasoningBuf.length === 0) return;
    steps.push({
      id: `thinking-${stepId++}`,
      type: 'thinking',
      reasoning: reasoningBuf.join('\n'),
      isActive,
    });
    reasoningBuf = [];
  };

  for (const part of parts) {
    if (!part?.type) continue;

    if (part.type === 'reasoning') {
      const text = part.reasoning || (part as any).text || '';
      if (text) reasoningBuf.push(text);
    } else if (part.type === 'dynamic-tool' || (part.type && part.type.startsWith('tool-'))) {
      const toolName = part.toolName || part.type.replace(/^tool-/, '');
      if (toolName === 'writeArtifact') continue;

      flushReasoning(isStreaming && reasoningBuf.length > 0 && !hasContent);
      steps.push(deriveSearchStep(part, stepId++));
    }
  }

  flushReasoning(isStreaming && !hasContent);
  appendMissingToolSteps(steps, toolInvocations, stepId);

  return steps;
}


function deriveSearchStep(part: any, fallbackId: number): TimelineStep {
  const sources: TimelineSource[] = [];
  const output = part.output || part.result;
  if (output?.results) {
    for (const r of output.results) {
      if (r.url) {
        sources.push({ url: r.url, title: r.title || r.snippet || '', snippet: r.snippet });
      }
    }
  }
  const state = part.state === 'output-available' ? 'result' : 'call';
  return {
    id: part.toolCallId || `search-${fallbackId}`,
    type: 'searching',
    query: part.input?.query || part.input?.url || '',
    isRunning: state !== 'result',
    sources,
    isActive: state !== 'result',
  };
}

function appendMissingToolSteps(steps: TimelineStep[], toolInvocations: any[] | undefined, startId: number) {
  if (!toolInvocations) return;
  const existingIds = new Set(steps.map(s => s.id));
  let stepId = startId;
  for (const ti of toolInvocations) {
    if (ti.toolName === 'writeArtifact' || existingIds.has(ti.toolCallId)) continue;
    steps.push(deriveSearchStep(ti, stepId++));
  }
}

function deriveFallbackSteps(reasoning: string, toolInvocations: any[] | undefined, isStreaming: boolean, hasContent: boolean): TimelineStep[] {
  const steps: TimelineStep[] = [];
  if (reasoning) {
    steps.push({
      id: 'thinking',
      type: 'thinking',
      reasoning,
      isActive: isStreaming && !hasContent,
    });
  }
  if (toolInvocations) {
    appendMissingToolSteps(steps, toolInvocations, 0);
  }
  return steps;
}
