import React from 'react';

interface ThinkingPadProps {
  isThinking: boolean;
  thinkingText?: string;
}

export const ThinkingPad: React.FC<ThinkingPadProps> = ({ isThinking, thinkingText = "AI is thinking..." }) => {
  if (!isThinking) return null;

  return (
    <div className="text-xs text-muted-foreground italic px-4 py-2 animate-pulse">
      {thinkingText}
    </div>
  );
};
