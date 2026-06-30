import { describe, it, expect, vi } from 'vitest';
import { cleanReasoning, extractThinkTags, mapUIMessageToLegacyMessage } from '../src/lib/chatUtils';

describe('chatUtils', () => {
  describe('cleanReasoning', () => {
    it('should strip artifact metadata', () => {
      const input = 'Thinking process\n* Type: `code`\n* Identifier: `math-utils`';
      expect(cleanReasoning(input)).toBe('Thinking process');
    });

    it('should strip search result URLs and patterns', () => {
      const input = 'I found this: https://example.com\n- https://google.com';
      expect(cleanReasoning(input)).toBe('I found this:');
    });

    it('should strip meta-cognition garbage', () => {
      const input = 'I will now try to calculate.\nLet me check again.\nActual result is 42.';
      expect(cleanReasoning(input)).toBe('Actual result is 42.');
    });
  });

  describe('extractThinkTags', () => {
    it('should extract completed think tags', () => {
      const input = '<think>I am thinking</think>Hello world';
      const result = extractThinkTags(input);
      expect(result.thinking).toBe('I am thinking');
      expect(result.cleanContent).toBe('Hello world');
    });

    it('should handle multiple think tags', () => {
      const input = '<think>One</think>Content<think>Two</think>';
      const result = extractThinkTags(input);
      expect(result.thinking).toBe('One\nTwo');
      expect(result.cleanContent).toBe('Content');
    });

    it('should handle incomplete think tags', () => {
      const input = '<think>Still thinking...';
      const result = extractThinkTags(input);
      expect(result.thinking).toBe('Still thinking...');
      expect(result.cleanContent).toBe('');
    });
  });

  describe('mapUIMessageToLegacyMessage', () => {
    it('should map parts-based messages to flat structure', () => {
      const uiMessage = {
        role: 'assistant',
        parts: [
          { type: 'reasoning', reasoning: 'Thinking...' },
          { type: 'text', text: 'Hello' }
        ]
      };
      const result = mapUIMessageToLegacyMessage(uiMessage);
      expect(result.content).toBe('Hello');
      expect(result.reasoning).toBe('Thinking...');
    });

    it('should extract tool invocations from parts', () => {
      const uiMessage = {
        role: 'assistant',
        parts: [
          {
            type: 'dynamic-tool',
            toolCallId: 'call-1',
            toolName: 'webSearch',
            input: { query: 'test' },
            state: 'output-available',
            output: { results: [] }
          }
        ]
      };
      const result = mapUIMessageToLegacyMessage(uiMessage);
      expect(result.toolInvocations).toHaveLength(1);
      expect(result.toolInvocations[0].toolName).toBe('webSearch');
      expect(result.toolInvocations[0].state).toBe('result');
    });

    it('should handle writeArtifact tool calls', () => {
      const uiMessage = {
        role: 'assistant',
        toolInvocations: [
          {
            toolName: 'writeArtifact',
            args: { identifier: 'id', title: 'Title', content: 'Code' },
            state: 'result'
          }
        ]
      };
      const result = mapUIMessageToLegacyMessage(uiMessage);
      expect(result.artifacts).toHaveLength(1);
      expect(result.artifacts[0].identifier).toBe('id');
      expect(result.artifacts[0].content).toBe('Code');
    });
  });
});
