import { useMemo, useRef, useState, useCallback } from 'react';

interface HtmlPreviewProps {
  content: string;
}

const CSP_META = `
<meta http-equiv="Content-Security-Policy" content="
  default-src 'none';
  script-src 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com;
  style-src 'unsafe-inline' https://cdnjs.cloudflare.com;
  img-src data: blob:;
  font-src data:;
  connect-src 'self';
  object-src 'none';
  base-uri 'none';
  form-action 'none';
">
`;

function buildSrcdoc(html: string): string {
  const cleaned = html.trim();

  if (cleaned.startsWith('<!DOCTYPE') || cleaned.startsWith('<html') || cleaned.startsWith('<head') || cleaned.startsWith('<body')) {
    return cleaned.replace('<head>', `<head>${CSP_META}`);
  }

  return `<!DOCTYPE html><html><head>${CSP_META}</head><body>${cleaned}</body></html>`;
}

export function HtmlPreview({ content }: HtmlPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [error, setError] = useState<string | null>(null);

  const srcdoc = useMemo(() => {
    try {
      return buildSrcdoc(content);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to build HTML');
      return '';
    }
  }, [content]);

  const handleLoad = useCallback(() => {
    try {
      const iframe = iframeRef.current;
      if (iframe?.contentDocument) {
        const hasErrors = iframe.contentDocument.querySelector('script[error]');
        if (hasErrors) {
          setError('Script execution error in preview');
        }
      }
    } catch {
      // Cross-origin errors are expected in strict sandbox; ignore
    }
  }, []);

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">Preview Error</p>
          <p className="text-xs text-red-600 mt-1">{error}</p>
        </div>
        <details className="mt-4">
          <summary className="text-xs text-neutral-500 cursor-pointer hover:text-neutral-700">Show source code</summary>
          <pre className="mt-2 p-4 bg-neutral-50 rounded-lg border border-neutral-200 text-xs font-mono whitespace-pre-wrap overflow-auto max-h-96">
            {content}
          </pre>
        </details>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 bg-white">
        <iframe
          ref={iframeRef}
          srcDoc={srcdoc}
          onLoad={handleLoad}
          sandbox="allow-scripts allow-same-origin"
          title="HTML Preview"
          className="w-full h-full border-0"
        />
      </div>
    </div>
  );
}
