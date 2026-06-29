import { memo, useCallback } from 'react';
import { UserBubble } from './UserBubble';
import { AssistantBubble } from './AssistantBubble';

interface ChatMessageRowProps {
  role: string;
  content: string;
  artifacts?: any[];
  toolInvocations?: any[];
  reasoning?: string;
  parts?: any[];
  contentBeforeTool?: string;
  contentAfterTool?: string;
  currentModel: string | undefined;
  isStreaming: boolean;
  prevUserContent?: string;
  onOpenArtifact: (artifact: any) => void;
  onCopy: (content: string) => void;
  onThumbsUp: () => void;
  onThumbsDown: () => void;
  handleSend: (content: string) => void;
}

export const ChatMessageRow = memo(function ChatMessageRow({
  role,
  content,
  artifacts,
  toolInvocations,
  reasoning,
  parts,
  contentBeforeTool,
  contentAfterTool,
  currentModel,
  isStreaming,
  prevUserContent,
  onOpenArtifact,
  onCopy,
  onThumbsUp,
  onThumbsDown,
  handleSend,
}: ChatMessageRowProps) {
  const handleMsgCopy = useCallback(() => onCopy(content), [content, onCopy]);
  const handleThumbsUp = useCallback(() => onThumbsUp(), [onThumbsUp]);
  const handleThumbsDown = useCallback(() => onThumbsDown(), [onThumbsDown]);
  const handleMsgRegenerate = useCallback(() => {
    if (prevUserContent) {
      handleSend(prevUserContent);
    }
  }, [prevUserContent, handleSend]);

  const handleOpenMsgArtifact = useCallback(() => {
    if (artifacts && artifacts.length > 0) {
      onOpenArtifact(artifacts[0]);
    }
  }, [artifacts, onOpenArtifact]);

  return (
    <>
      {role === 'user' ? (
        <UserBubble content={content} />
      ) : (
        <AssistantBubble
          content={content}
          model={currentModel}
          isStreaming={isStreaming}
          toolInvocations={toolInvocations}
          reasoning={reasoning}
          parts={parts}
          artifacts={artifacts}
          contentBeforeTool={contentBeforeTool}
          contentAfterTool={contentAfterTool}
          onOpenArtifact={
            artifacts && artifacts.length > 0 ? handleOpenMsgArtifact : undefined
          }
          onCopy={handleMsgCopy}
          onThumbsUp={handleThumbsUp}
          onThumbsDown={handleThumbsDown}
          onRegenerate={handleMsgRegenerate}
        />
      )}
    </>
  );
});
