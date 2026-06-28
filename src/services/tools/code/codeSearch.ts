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

export const codeSearchTool: ToolDef = {
  name: 'code_search',
  description: 'Search the codebase for symbols, function definitions, imports, or patterns. Returns results with surrounding context lines.',
  category: 'code',
  inputSchema: z.object({
    pattern: z.string().describe('The search pattern. Can be a regex, exact symbol name, or partial match.'),
    path: z.string().describe('Absolute path to the root directory to search in.'),
    include: z.string().optional().describe('Only search files matching this glob pattern (e.g. "*.ts", "*.{ts,tsx,js}").'),
    contextLines: z.number().optional().default(2).describe('Number of lines of context before and after each match.'),
    maxResults: z.number().optional().default(50).describe('Maximum number of results to return.'),
  }),
  execute: async ({ pattern, path, include, contextLines, maxResults }) => {
    const mod = await loadFs();
    if (!mod) throw new Error('Filesystem access requires the Tauri desktop app');
    const fs = mod;

    const results: Array<{
      path: string;
      line: number;
      content: string;
      context: { before: string[]; after: string[] };
    }> = [];

    function matchesInclude(name: string): boolean {
      if (!include) return true;
      const incRegex = new RegExp('^' + include.replace(/\*/g, '.*').replace(/\?/g, '.').replace(/\{([^}]+)\}/g, '($1)').replace(/,/g, '|') + '$', 'i');
      return incRegex.test(name);
    }

    async function walk(dir: string): Promise<void> {
      if (results.length >= maxResults!) return;
      try {
        const entries = await fs.readDir(dir);
        for (const entry of entries) {
          if (results.length >= maxResults!) return;
          const fullPath = `${dir}/${entry.name}`;
          if (entry.isDirectory && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
            await walk(fullPath);
          } else if (entry.isFile && matchesInclude(entry.name)) {
            try {
              const content = await fs.readTextFile(fullPath);
              const lines = content.split('\n');
              const regex = new RegExp(pattern, 'gi');
              for (let i = 0; i < lines.length; i++) {
                if (results.length >= maxResults!) return;
                regex.lastIndex = 0;
                if (regex.test(lines[i])) {
                  const before = lines.slice(Math.max(0, i - contextLines!), i);
                  const after = lines.slice(i + 1, i + 1 + contextLines!);
                  results.push({ path: fullPath, line: i + 1, content: lines[i].trim(), context: { before, after } });
                }
              }
            } catch {
              // skip unreadable files
            }
          }
        }
      } catch {
        // skip unreadable directories
      }
    }

    await walk(path);
    return { pattern, path, results, count: results.length, truncated: results.length >= maxResults! };
  },
};
