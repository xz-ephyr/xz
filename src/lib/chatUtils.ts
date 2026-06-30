import type { Artifact } from '../types/artifact';
import { parseArtifacts } from './artifactParser';

const artifactMetadataRegex = /^\s*\*\s*(?:Type|Identifier|Title):\s*`[^`]+`\s*$/gim;
const artifactInlineRegex = /^\s*`identifier`:\s*`[^`]+`\s*\*\s*`type`:\s*`[^`]+`\s*\*\s*`title`:\s*`[^`]+`/i;
const searchResultRegex = /(?:^|\n)(?:Results?|Search results?)(?:\s*\d*)?:.*(?:\n|$)/gi;
const urlInReasoningRegex = /(?:^|\n)\s*[-•*]\s*https?:\/\/\S+/gm;
const resultBlockRegex = /(?:^|\n)(?:\d+\.\s*\[.*?\]\(.*?\)|\[\d+\]:\s*https?:\/\/\S+)/gm;
const metaCognitionLineRegex = /^(?:I\s+(?:am|keep|will|must|should|need|can|have|was|had|shall)|I'm|Let\s+me|Wait[\s,]+I|Actually[\s,]+|Okay[\s,]+|Hmm[\s,]+|The\s+(?:error|previous|tool|call|API)\s|This\s+(?:is|suggests|means)|Looking\s+(?:at|back)|As\s+of\s+my\s+current|After\s+|I'll|I've|I'd).*/gim;
const retryPhraseRegex = /(?:Try\s+(?:a|the|again|one)|Retry|Attempt\s+\d|Again,?|One more|Let me\s+(?:try|see|check|look|be|do|make)|I will\s+(?:now|try|attempt|call|remove|omit|use|just|simply|consciously|absolutely|be|not)|I keep\s+(?:including|making|doing|typing|getting|sending|adding|forgetting)|I am\s+(?:struggling|failing|having|experiencing|going|literally|typing|unable|in\s+a|somehow|clearly|repeating)|I must\s+(?:stop|try|remove|omit|not)|I should\s+(?:try|just|probably|really)|I cannot\s+(?:stop|seem|figure)|Wait,\s+I\s+(?:am|see|keep|will)|Actually,?\s+(?:looking|I|the|let)|Okay,?\s+(?:I|let|the|so|enough)|I'm\s+(?:going|having|struggling|failing|in|literally|an\s+AI))[\s\S]*?(?:\n|$)/gim;

export function cleanReasoning(reasoning: string): string {
  let cleaned = reasoning.split('\n').filter((l) => !artifactMetadataRegex.test(l) && !artifactInlineRegex.test(l)).join('\n');
  cleaned = cleaned.replace(searchResultRegex, '').replace(urlInReasoningRegex, '').replace(resultBlockRegex, '').replace(/https?:\/\/\S+/g, '').replace(metaCognitionLineRegex, '').replace(retryPhraseRegex, '');
  return cleaned.replace(/\n{3,}/g, '\n\n').trim();
}

export function extractThinkTags(content: string): { cleanContent: string; thinking: string } {
  let cleanContent = content; const thinkingParts: string[] = [];
  const fullRegex = /<think>([\s\S]*?)<\/think>/gi; let match;
  while ((match = fullRegex.exec(content)) !== null) { thinkingParts.push(match[1].trim()); cleanContent = cleanContent.replace(match[0], ''); }
  if (!content.includes('</think>')) {
    const incompleteMatch = /<think>([\s\S]*?)$/i.exec(cleanContent);
    if (incompleteMatch) { thinkingParts.push(incompleteMatch[1].trim()); cleanContent = cleanContent.replace(incompleteMatch[0], ''); }
  }
  return { cleanContent: cleanContent.trim(), thinking: thinkingParts.join('\n') };
}

function extractContent(m: any): string {
  if (m.content) return m.content;
  if (Array.isArray(m.parts)) return m.parts.filter((p: any) => p.type === 'text').map((p: any) => p.text).join('');
  return '';
}

function extractReasoning(m: any): string {
  let r = m.reasoning || '';
  if (!r && Array.isArray(m.parts)) r = m.parts.filter((p: any) => p.type === 'reasoning').map((p: any) => p.reasoning || p.text || '').join('');
  return cleanReasoning(r);
}

function extractToolInvocations(m: any): any[] | undefined {
  if (m.toolInvocations) return m.toolInvocations;
  if (!Array.isArray(m.parts)) return undefined;
  return m.parts.filter((p: any) => p.type === 'dynamic-tool' || (p.type && p.type.startsWith('tool-'))).map((p: any) => ({
    state: p.state === 'output-available' ? 'result' : p.state === 'input-available' ? 'call' : p.state,
    toolCallId: p.toolCallId, toolName: p.toolName || p.type.replace(/^tool-/, ''), args: p.input, result: p.output, error: p.errorText,
  }));
}

export const mapUIMessageToLegacyMessage = (m: any): any => {
  if (!m) return m;
  let content = extractContent(m); let reasoning = extractReasoning(m);
  if (reasoning && content) { const idx = content.indexOf(reasoning); if (idx !== -1) content = (content.slice(0, idx) + content.slice(idx + reasoning.length)).trim(); }
  const { cleanContent, thinking } = extractThinkTags(content); content = cleanContent;
  if (thinking) reasoning = reasoning ? `${reasoning}\n\n${thinking}` : thinking;
  const toolInvocations = extractToolInvocations(m);
  const writeArtifactCalls = (toolInvocations || []).filter((ti: any) => ti.toolName === 'writeArtifact' && ti.args?.identifier && ti.args?.content);
  let artifacts: Artifact[] = []; let cleanText = content;
  if (writeArtifactCalls.length > 0) {
    const call = writeArtifactCalls[0];
    artifacts = [{ identifier: call.args.identifier, type: call.args.type || 'code', title: call.args.title || call.args.identifier, language: call.args.language, content: call.args.content, version: 0, createdAt: Date.now() }];
  } else { const parsed = parseArtifacts(content); artifacts = parsed.artifacts; cleanText = parsed.cleanText; }
  let contentBeforeTool: string | undefined, contentAfterTool: string | undefined;
  if (writeArtifactCalls.length > 0 && Array.isArray(m.parts)) {
    const idx = m.parts.findIndex((p: any) => (p.type === 'dynamic-tool' || p.type?.startsWith('tool-')) && (p.toolName === 'writeArtifact' || p.type?.includes('writeArtifact')));
    if (idx >= 0) {
      contentBeforeTool = m.parts.slice(0, idx).filter((p: any) => p.type === 'text').map((p: any) => p.text).join('');
      contentAfterTool = m.parts.slice(idx + 1).filter((p: any) => p.type === 'text').map((p: any) => p.text).join('');
    }
  }
  return { ...m, content: cleanText || content, reasoning, toolInvocations, contentBeforeTool, contentAfterTool, artifacts, hasPartialArtifact: /<antArtifact\b/i.test(content) };
};
