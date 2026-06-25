import { useRef, useState, useCallback, useEffect } from 'react';
// @ts-expect-error - @babel/standalone has no types
import * as Babel from '@babel/standalone';

interface ReactPreviewProps {
  content: string;
  onError?: (error: string) => void;
}

function normalizeCode(code: string): string {
  let normalized = code.trim();

  if (!normalized.includes('export default')) {
    return normalized;
  }

  normalized = normalized.replace(/export default\s*(function|class|const|let|var)/, '$1');

  normalized = normalized
    .replace(/import\s+(\w+)\s+from\s+["']react["']/g, 'var $1 = window.React;')
    .replace(/import\s+\{\s*(\w+(?:\s*,\s*\w+)*)\s*\}\s+from\s+["']react["']/g, (_, imports) => {
      return imports.split(',').map((i: string) => `var ${i.trim()} = window.React;`).join('\n');
    })
    .replace(/import\s+\{\s*([^}]+)\s*\}\s+from\s+["']lucide-react["']/g, (_, imports) => {
      return imports.split(',').map((i: string) => {
        const name = i.trim();
        return `var ${name} = window.lucideReact && window.lucideReact.${name};`;
      }).join('\n');
    })
    .replace(/import\s+\{\s*([^}]+)\s*\}\s+from\s+["']recharts["']/g, (_, imports) => {
      return imports.split(',').map((i: string) => {
        const name = i.trim();
        return `var ${name} = window.recharts && window.recharts.${name};`;
      }).join('\n');
    });

  return normalized;
}

function transpile(code: string): string {
  try {
    const result = Babel.transform(code, {
      presets: ['react', ['typescript', { isTSX: true, allExtensions: true }]],
      filename: 'artifact.tsx',
      compact: false,
      retainLines: true,
    });
    return result.code || code;
  } catch (e) {
    throw new Error(`Transpilation failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
  }
}

function buildSrcdoc(transpiledCode: string, _originalCode: string): string {
  const escapedCode = transpiledCode
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="
  default-src 'none';
  script-src 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com https://unpkg.com;
  style-src 'unsafe-inline' https://cdnjs.cloudflare.com https://fonts.googleapis.com;
  img-src data: blob:;
  font-src data: https://fonts.gstatic.com;
  connect-src 'self';
  object-src 'none';
  base-uri 'none';
  form-action 'none';
">
<script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js"></script>
<script src="https://cdn.tailwindcss.com"></script>
<script src="https://unpkg.com/lucide-react@0.263.1/dist/umd/lucide-react.min.js"></script>
<script src="https://unpkg.com/recharts@2.12.0/umd/Recharts.min.js"></script>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  #root { min-height: 100vh; }
  .error-card {
    padding: 20px; margin: 16px; border-radius: 8px;
    border: 1px solid #fecaca; background: #fef2f2;
  }
  .error-card p { color: #991b1b; font-size: 14px; margin-bottom: 12px; }
  .error-card .error-message {
    font-family: monospace; font-size: 12px;
    color: #dc2626; background: #fff;
    padding: 8px; border-radius: 4px;
    white-space: pre-wrap; word-break: break-word;
  }
</style>
</head>
<body>
<div id="root"></div>
<script>
  window.__ARTIFACT_ERROR__ = null;
  window.addEventListener('error', function(e) {
    window.__ARTIFACT_ERROR__ = e.message || 'Unknown error';
    renderError(window.__ARTIFACT_ERROR__);
    e.preventDefault();
  });

  function renderError(msg) {
    var root = document.getElementById('root');
    if (root) {
      root.innerHTML = '<div class="error-card"><p>Failed to render component</p><div class="error-message">' +
        msg.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') +
        '</div></div>';
      window.parent && window.parent.postMessage({ type: 'ARTIFACT_ERROR', error: msg }, '*');
    }
  }

  try {
    window.React = React;
    if (typeof lucideReact !== 'undefined') {
      window.lucideReact = lucideReact;
    }
    if (typeof Recharts !== 'undefined') {
      window.recharts = Recharts;
    }

    ${escapedCode}

    var Component = null;
    if (typeof App !== 'undefined') Component = App;
    else if (typeof default_export !== 'undefined') Component = default_export;
    else {
      var keys = Object.keys(window).filter(function(k) {
        return typeof window[k] === 'function' && k !== 'React' && k !== 'ReactDOM' &&
          k !== 'lucideReact' && k !== 'recharts' && k !== 'Recharts' &&
          !k.startsWith('__') && !k.startsWith('webkit');
      });
      if (keys.length > 0) Component = window[keys[0]];
    }

    if (Component) {
      var root = ReactDOM.createRoot(document.getElementById('root'));
      root.render(React.createElement(Component));
    } else {
      renderError('No component found. Make sure your code has a default export or defines a function/class component.');
    }
  } catch (e) {
    renderError(e.message || 'Unknown error');
  }
</script>
</body>
</html>`;
}

export function ReactPreview({ content, onError }: ReactPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [srcdoc, setSrcdoc] = useState<string>('');

  useEffect(() => {
    setError(null);
    try {
      const normalized = normalizeCode(content);
      const transpiled = transpile(normalized);
      const doc = buildSrcdoc(transpiled, content);
      setSrcdoc(doc);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setError(msg);
      onError?.(msg);
    }
  }, [content, onError]);

  const handleMessage = useCallback((e: MessageEvent) => {
    if (e.data?.type === 'ARTIFACT_ERROR') {
      setError(e.data.error);
      onError?.(e.data.error);
    }
  }, [onError]);

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleMessage]);

  const handleRetry = useCallback(() => {
    setError(null);
    try {
      const normalized = normalizeCode(content);
      const transpiled = transpile(normalized);
      const doc = buildSrcdoc(transpiled, content);
      setSrcdoc(doc);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setError(msg);
      onError?.(msg);
    }
  }, [content, onError]);

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">Failed to render React component</p>
          <pre className="mt-2 text-xs text-red-600 whitespace-pre-wrap font-mono">{error}</pre>
          <button
            onClick={handleRetry}
            className="mt-3 px-3 py-1.5 text-xs font-medium bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
          >
            Retry
          </button>
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

  if (!srcdoc) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-sm text-neutral-400 py-8">Preparing preview...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 bg-white">
        <iframe
          ref={iframeRef}
          srcDoc={srcdoc}
          sandbox="allow-scripts allow-same-origin"
          title="React Preview"
          className="w-full h-full border-0"
        />
      </div>
    </div>
  );
}
