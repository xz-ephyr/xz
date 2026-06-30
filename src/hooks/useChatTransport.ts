import { useMemo } from 'react';
import { DefaultChatTransport } from 'ai';
import { chatCompletion, getAIErrorMessage } from '../services/aiService';
import type { ProjectContext } from '../services/ai/contextController';

export function useChatTransport(
  uuid: string | undefined,
  currentModel: string,
  currentModelRef: React.MutableRefObject<string | null>,
  previousModelRef: React.MutableRefObject<string | null>,
  isThinkingEnabledRef: React.MutableRefObject<boolean>,
  getProjectContext: () => Promise<ProjectContext | undefined>
) {
  return useMemo(() => {
    const refs = { currentModelRef, isThinkingEnabledRef, previousModelRef };
    return new DefaultChatTransport({
      fetch: async (_url: any, options: any) => {
        if (!options?.body) throw new Error('Request body is missing');
        const body = JSON.parse(options.body as string);

        const effectiveModel = refs.currentModelRef.current || body.model;
        const thinkingEnabled = refs.isThinkingEnabledRef.current;
        const prevModel = refs.previousModelRef.current;

        const projectContext = uuid && uuid !== 'new' ? await getProjectContext() : undefined;
        const result = await chatCompletion({
          messages: body.messages,
          modelName: effectiveModel,
          isThinkingEnabled: thinkingEnabled,
          abortSignal: options?.signal,
          previousModelName: prevModel || undefined,
          sessionId: uuid,
          projectContext,
        });
        previousModelRef.current = effectiveModel;
        return (result as any).toUIMessageStreamResponse({ getErrorMessage: getAIErrorMessage });
      },
      body: { model: currentModel },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uuid, getProjectContext, currentModel, currentModelRef, isThinkingEnabledRef, previousModelRef]);
}
