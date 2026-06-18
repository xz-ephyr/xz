import React from 'react';
import { CopyButton } from './CopyButton';

export const UserBubble = React.memo(({ content }: { content: string }) => {
  return (
    <div className="flex flex-col items-end mb-6 group w-full">
      <div className="relative bg-neutral-100 rounded-2xl rounded-tr-sm text-[15px] max-w-[85%] text-neutral-900 border border-neutral-200/50 shadow-sm">
        <div className="px-5 py-3 whitespace-pre-wrap break-words leading-relaxed">
          {content}
        </div>
      </div>
      <div className="mr-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <CopyButton content={content} alwaysVisible={false} />
      </div>
    </div>
  );
});
