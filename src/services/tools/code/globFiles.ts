import { z } from 'zod';
import type { ToolDef } from '../types';
import { isTauri } from '../../../lib/tauri';

async function loadFs() {
  if (!isTauri()) return null;
  try {
    return await import('@tauri-apps/plugin-fs');
  } catch {
    return null;
  }
}

function patternToRegex(glob: string): RegExp {
  let re = '^';
  let i = 0;
  while (i < glob.length) {
    const ch = glob[i];
    if (ch === '*') {
      if (i + 1 < glob.length && glob[i + 1] === '*') {
        if (i + 2 < glob.length && (glob[i + 2] === '/' || glob[i + 2] === '\\')) {
          re += '.*';
          i += 3;
          continue;
        }
        re += '.*';
        i += 2;
        continue;
      }
      re += '[^/\\\\]*';
      i++;
    } else if (ch === '?') {
      re += '[^/\\\\]';
      i++;
    } else if (ch === '{') {
      const end = glob.indexOf('}', i);
      const parts = glob.slice(i + 1, end).split(',');
      re += '(' + parts.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')';
      i = end + 1;
    } else if (ch === '.') {
      re += '\\.';
      i++;
    } else if ('+^${}()|[\\]'.includes(ch)) {
      re += '\\' + ch;
      i++;
    } else {
      re += ch;
      i++;
    }
  }
  re += '$';
  return new RegExp(re, 'i');
}

export const globFilesTool: ToolDef = {
  name: 'glob_files',
  description: 'Resolve a glob pattern to matching file paths. Supports ** (any depth), * (single segment), ? (single char), and {a,b} (alternation).',
  category: 'code',
  inputSchema: z.object({
    pattern: z.string().describe('Glob pattern to match (e.g. "src/**/*.ts", "**/*.{ts,tsx}", "*.json").'),
    path: z.string().describe('Absolute path to the root directory to search in.'),
    maxResults: z.number().optional().default(500).describe('Maximum number of results to return.'),
  }),
  execute: async ({ pattern, path, maxResults }) => {
    const mod = await loadFs();
    if (!mod) throw new Error('Filesystem access requires the Tauri desktop app');
    const fs = mod;

    const segments = pattern.split(/[/\\]/).filter(Boolean);
    const results: string[] = [];

    async function walk(dir: string, depth: number): Promise<void> {
      if (results.length >= maxResults!) return;
      if (depth >= segments.length) {
        results.push(dir);
        return;
      }

      const seg = segments[depth];
      if (seg === '**') {
        await walk(dir, depth + 1);
        try {
          const entries = await fs.readDir(dir);
          for (const entry of entries) {
            if (results.length >= maxResults!) return;
            if (entry.isDirectory) {
              await walk(`${dir}/${entry.name}`, depth);
            }
          }
        } catch { /* skip unreadable */ }
      } else {
        const regex = patternToRegex(seg);
        try {
          const entries = await fs.readDir(dir);
          for (const entry of entries) {
            if (results.length >= maxResults!) return;
            if (regex.test(entry.name)) {
              const fullPath = `${dir}/${entry.name}`;
              if (depth === segments.length - 1) {
                results.push(fullPath);
              } else if (entry.isDirectory) {
                await walk(fullPath, depth + 1);
              }
            }
          }
        } catch { /* skip unreadable */ }
      }
    }

    await walk(path, 0);
    return { pattern, path, results, count: results.length, truncated: results.length >= maxResults! };
  },
};
