import { describe, it, expect, vi } from 'vitest';
import { getChatStream } from '../src/services/aiService';

// Mock the AI SDK
vi.mock('@ai-sdk/google', () => ({
  createGoogleGenerativeAI: vi.fn(() => vi.fn((modelName) => {
    if (modelName.startsWith('gemma-4') || modelName.includes('3.5') || modelName.includes('2.5')) {
       throw new Error(`Model not found: ${modelName}`);
    }
    return { modelId: modelName };
  }))
}));

vi.mock('ai', () => ({
  streamText: vi.fn(({ model }) => {
    if (!model) throw new Error('No model provided');
    return Promise.resolve({
      textStream: (async function* () { yield 'response'; })()
    });
  })
}));

describe('aiService', () => {
  it('should fail with invalid model names', async () => {
    const apiKey = 'test-key';
    const messages = [{ role: 'user' as const, content: 'hello' }];
    const invalidModel = 'gemma-4-31b';

    await expect(getChatStream(messages, apiKey, invalidModel)).rejects.toThrow('Model not found: gemma-4-31b');
  });

  it('should succeed with valid model names', async () => {
    const apiKey = 'test-key';
    const messages = [{ role: 'user' as const, content: 'hello' }];
    const validModel = 'gemini-1.5-flash';

    const stream = await getChatStream(messages, apiKey, validModel);
    expect(stream).toBeDefined();
  });
});
