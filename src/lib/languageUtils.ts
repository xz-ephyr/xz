import { javascript } from '@codemirror/lang-javascript';
import { html } from '@codemirror/lang-html';
import { markdown } from '@codemirror/lang-markdown';
import { python } from '@codemirror/lang-python';
import { css } from '@codemirror/lang-css';
import { json } from '@codemirror/lang-json';
import { rust } from '@codemirror/lang-rust';

const langMap: Record<string, any> = {
  js: javascript, jsx: javascript, ts: javascript, tsx: javascript, javascript: javascript, typescript: javascript,
  html: html, css: css, scss: css, less: css, json: json, python: python, py: python, rust: rust, rs: rust, md: markdown, markdown: markdown
};

export const getLanguageExtension = (lang: string) => {
  const l = lang.toLowerCase();
  const fn = langMap[l] || javascript;
  if (l.includes('jsx') || l.includes('tsx') || l.includes('javascript') || l.includes('typescript')) return [fn({ jsx: true, typescript: true })];
  return [fn()];
};
