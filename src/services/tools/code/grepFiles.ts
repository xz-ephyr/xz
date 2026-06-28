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

export const grepFilesTool: ToolDef = {
  name: 'grep_files',
  description: 'Search for a regex pattern across files in a directory. Returns matching lines with file paths and line numbers.',
  category: 'code',
  inputSchema: z.object({
    pattern: z.string().describe('The regex pattern to search for. Supports standard JavaScript regex syntax.'),
    path: z.string().describe('Absolute path to the root directory to search in.'),
    include: z.string().optional().describe('Only search files matching this glob pattern (e.g. "*.ts", "*.{ts,tsx}").'),
    maxResults: z.number().optional().default(200).describe('Maximum number of matching lines to return.'),
  }),
  execute: async ({ pattern, path, include, maxResults }) => {
    const mod = await loadFs();
    if (!mod) throw new Error('Filesystem access requires the Tauri desktop app');
    const fs = mod;

    const regex = new RegExp(pattern, 'g');
    const results: Array<{ path: string; line: number; content: string }> = [];

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
          if (entry.isDirectory) {
            await walk(fullPath);
          } else if (entry.isFile && matchesInclude(entry.name)) {
            try {
              const content = await fs.readTextFile(fullPath);
              const lines = content.split('\n');
              for (let i = 0; i < lines.length; i++) {
                if (results.length >= maxResults!) return;
                regex.lastIndex = 0;
                if (regex.test(lines[i])) {
                  results.push({ path: fullPath, line: i + 1, content: lines[i].trim() });
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
