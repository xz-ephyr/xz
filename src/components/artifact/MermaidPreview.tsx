import { useEffect, useRef, useState } from 'react';

interface MermaidPreviewProps {
  content: string;
  onError?: (error: string) => void;
}

export function MermaidPreview({ content, onError }: MermaidPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const renderDiagram = async () => {
      setLoading(true);
      setError(null);

      try {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: 'neutral',
          securityLevel: 'sandbox',
        });

        if (cancelled) return;

        const { svg } = await mermaid.render('mermaid-artifact', content);
        if (cancelled) return;

        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to render diagram';
        setError(msg);
        onError?.(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    renderDiagram();

    return () => {
      cancelled = true;
    };
  }, [content, onError]);

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">Failed to render diagram</p>
          <pre className="mt-2 text-xs text-red-600 whitespace-pre-wrap font-mono">{error}</pre>
        </div>
        <pre className="mt-4 p-4 bg-neutral-50 rounded-lg border border-neutral-200 text-xs font-mono whitespace-pre-wrap overflow-auto max-h-64">
          {content}
        </pre>
      </div>
    );
  }

  return (
    <div className="p-6 flex items-start justify-center">
      {loading && (
        <div className="text-sm text-neutral-400 py-8">Rendering diagram...</div>
      )}
      <div
        ref={containerRef}
        className={`max-w-full overflow-auto ${loading ? 'hidden' : ''}`}
      />
    </div>
  );
}
