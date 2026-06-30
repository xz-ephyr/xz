import { useMemo } from 'react';

export function useChatMeta(folder: string | undefined, messages: any[], isLoading: boolean) {
  const currentProjectName = useMemo(() => {
    if (!folder) return undefined;
    return folder.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }, [folder]);

  const lastAssistantIndex = useMemo(() => {
    if (!isLoading) return -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role !== 'user') return i;
    }
    return -1;
  }, [messages, isLoading]);

  return { currentProjectName, lastAssistantIndex };
}
