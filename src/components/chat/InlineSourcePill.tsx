import { useState, useRef, useEffect } from 'react';

interface InlineSourcePillProps {
  url: string;
  title: string;
  snippet?: string;
}

function getDomain(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}

export function InlineSourcePill({ url, title, snippet }: InlineSourcePillProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const show = () => {
    clearTimeout(timeoutRef.current);
    setIsOpen(true);
  };

  const hide = () => {
    timeoutRef.current = setTimeout(() => setIsOpen(false), 150);
  };

  useEffect(() => {
    return () => clearTimeout(timeoutRef.current);
  }, []);

  const domain = getDomain(url);
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=16`;

  return (
    <span ref={ref} className="inline-source-pill relative inline-flex items-center mx-0.5 align-middle">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onMouseEnter={show}
        onMouseLeave={hide}
        onClick={(e) => e.stopPropagation()}
        className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full bg-white hover:bg-neutral-100 border border-neutral-300 transition-colors no-underline shadow-sm hover:shadow-md cursor-pointer"
        title={title || domain}
      >
        <img src={faviconUrl} alt="" width={10} height={10} className="rounded" loading="lazy" />
      </a>

      {isOpen && (
        <span
          onMouseEnter={show}
          onMouseLeave={hide}
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-auto"
        >
          <span className="block bg-white border border-neutral-200 rounded-lg shadow-lg p-3 min-w-[220px] max-w-[320px]">
            <span className="block text-xs font-medium text-neutral-800 truncate mb-0.5">{title || domain}</span>
            {domain && <span className="block text-[11px] text-neutral-400 truncate mb-1">{domain}</span>}
            {snippet && (
              <span className="block text-[11px] text-neutral-600 leading-relaxed border-t border-neutral-100 pt-1 mt-1">
                {snippet}
              </span>
            )}
            <span className="block absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-white border-r border-b border-neutral-200" />
          </span>
        </span>
      )}
    </span>
  );
}
