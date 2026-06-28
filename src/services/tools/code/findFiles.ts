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

function matchesGlob(name: string, pattern: string): boolean {
  const regex = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$', 'i');
  return regex.test(name);
}

export const findFilesTool: ToolDef = {
  name: 'find_files',
  description: 'Recursively find files matching a glob pattern within a directory. Returns matching file paths.',
  category: 'code',
  inputSchema: z.object({
    pattern: z.string().describe('Glob pattern to match file names against (e.g. "*.ts", "*.{ts,tsx}", "**/*.test.*").'),
    path: z.string().describe('Absolute path to the root directory to search in.'),
    maxResults: z.number().optional().default(100).describe('Maximum number of results to return.'),
  }),
  execute: async ({ pattern, path, maxResults }) => {
    const mod = await loadFs();
    if (!mod) throw new Error('Filesystem access requires the Tauri desktop app');
    const fs = mod;

    const results: string[] = [];

    async function walk(dir: string): Promise<void> {
      if (results.length >= maxResults!) return;
      try {
        const entries = await fs.readDir(dir);
        for (const entry of entries) {
          if (results.length >= maxResults!) return;
          const fullPath = `${dir}/${entry.name}`;
          if (entry.isDirectory) {
            await walk(fullPath);
          } else if (entry.isFile && matchesGlob(entry.name, pattern)) {
            results.push(fullPath);
          }
        }
      } catch {
        // skip directories we cannot read
      }
    }

    await walk(path);
    return { path, pattern, results, count: results.length, truncated: results.length >= maxResults! };
  },
};
