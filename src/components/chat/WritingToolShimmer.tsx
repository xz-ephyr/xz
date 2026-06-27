import React from 'react';
import { PencilEdit02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

interface WritingToolShimmerProps {
  title: string;
  done?: boolean;
}

export const WritingToolShimmer = React.memo(({ title, done = false }: WritingToolShimmerProps) => {
  return (
    <div className="inline-flex items-center gap-1.5 text-xs font-medium min-w-0">
      <HugeiconsIcon icon={PencilEdit02Icon} size={14} className="text-muted-foreground/70 shrink-0" />
      <span className={`${done ? 'text-muted-foreground' : 'thinking-shimmer-text'} truncate`}>
        {done ? 'Wrote' : 'Writing'}: {title}
      </span>
    </div>
  );
});
