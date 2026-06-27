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
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4">
          <p className="text-sm font-medium text-destructive">Failed to render diagram</p>
          <pre className="mt-2 text-xs text-destructive whitespace-pre-wrap font-mono">{error}</pre>
          <button
            onClick={() => onError?.(error)}
            className="mt-3 px-3 py-1.5 text-xs font-medium bg-destructive/20 text-destructive rounded-md hover:bg-destructive/30 transition-colors"
          >
            Fix with Claude
          </button>
        </div>
        <pre className="mt-4 p-4 bg-muted rounded-lg border border-border text-xs font-mono whitespace-pre-wrap overflow-auto max-h-64 text-foreground">
          {content}
        </pre>
      </div>
    );
  }

  return (
    <div className="p-6 flex items-start justify-center">
      {loading && (
        <div className="text-sm text-muted-foreground py-8">Rendering diagram...</div>
      )}
      <div
        ref={containerRef}
        className={`max-w-full overflow-auto ${loading ? 'hidden' : ''}`}
      />
    </div>
  );
}
