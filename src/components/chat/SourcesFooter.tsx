import { memo } from 'react';
import { TimelineSource } from './ThinkingTimeline';

export const SourcesFooter = memo(({ sources }: { sources: TimelineSource[] }) => {
  const maxVisible = 4;
  const visible = sources.slice(0, maxVisible);
  const remaining = sources.length - maxVisible;
  if (sources.length === 0) return null;
  return (
    <div className="flex items-center" title="Sources used">
      {visible.map((src, i) => {
        let domain = '';
        try { domain = new URL(src.url).hostname.replace(/^www\./, ''); } catch { domain = src.url; }
        return (
          <a key={i} href={src.url} target="_blank" rel="noopener noreferrer" title={src.title || src.url}
             className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white hover:bg-neutral-100 border border-neutral-200 transition-colors no-underline -ml-1 first:ml-0 shadow-sm hover:shadow-md">
            <img src={`https://www.google.com/s2/favicons?domain=${domain}&sz=16`} alt={domain} width={12} height={12} className="rounded" loading="lazy" />
          </a>
        );
      })}
      {remaining > 0 && <span className="inline-flex items-center justify-center w-5 h-5 rounded-full -ml-1 bg-neutral-100 border border-neutral-200 text-[10px] font-medium text-neutral-500 shrink-0" title={`${remaining} more source${remaining > 1 ? 's' : ''}`}>+{remaining}</span>}
    </div>
  );
});
