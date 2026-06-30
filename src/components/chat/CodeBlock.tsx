import React, { useState, useCallback } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Copy01Icon, Tick01Icon } from '@hugeicons/core-free-icons';
import CodeMirror from '@uiw/react-codemirror';
import { EditorView } from '@codemirror/view';
import { getLanguageExtension } from '../../lib/languageUtils';

const theme = EditorView.theme({ '&': { padding: '0' }, '.cm-scroller': { padding: '0' }, '.cm-content': { padding: '12px 16px' }, '.cm-line': { padding: '0' } });

export const CodeBlock = React.memo(({ content, language }: { content: string; language?: string }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => { navigator.clipboard.writeText(content); setCopied(true); setTimeout(() => setCopied(false), 2000); }, [content]);

  return (
    <div className="relative w-full rounded-[6px] overflow-hidden my-4 bg-neutral-50">
      {language && <div className="px-4 py-1.5 text-[11px] uppercase tracking-wide text-neutral-500 bg-neutral-50">{language}</div>}
      <button onClick={handleCopy} className={`absolute top-1 right-1 p-1.5 rounded-[6px] transition-colors z-10 ${copied ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`} title="Copy code"><HugeiconsIcon icon={copied ? Tick01Icon : Copy01Icon} size={14} /></button>
      <CodeMirror value={content} theme="light" extensions={[...getLanguageExtension(language || ''), theme]} readOnly={true} basicSetup={{ lineNumbers: false, foldGutter: false, highlightActiveLine: false, bracketMatching: true, syntaxHighlighting: true }} />
    </div>
  );
});
