import React from 'react';
import { PencilEdit02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

interface WritingToolShimmerProps {
  title: string;
  done?: boolean;
}

export const WritingToolShimmer = React.memo(({ title }: WritingToolShimmerProps) => {
  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-neutral-50 dark:bg-neutral-800 rounded-[6px] text-xs font-medium border border-neutral-200 dark:border-neutral-700 min-w-0 text-neutral-500 dark:text-neutral-400">
      <HugeiconsIcon icon={PencilEdit02Icon} size={14} className="shrink-0" />
      <span className="truncate">Writing: {title}</span>
    </div>
  );
});
