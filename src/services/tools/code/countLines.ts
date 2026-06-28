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

export const countLinesTool: ToolDef = {
  name: 'count_lines',
  description: 'Count the number of lines in a file, optionally filtering by a regex pattern.',
  category: 'code',
  inputSchema: z.object({
    path: z.string().describe('Absolute path to the file.'),
    pattern: z.string().optional().describe('Optional regex pattern. Only counts lines matching this pattern.'),
  }),
  execute: async ({ path, pattern }) => {
    const mod = await loadFs();
    if (!mod) throw new Error('Filesystem access requires the Tauri desktop app');
    const content = await mod.readTextFile(path);
    const lines = content.split('\n');
    let totalLines = lines.length;
    let nonEmptyLines = lines.filter(l => l.trim().length > 0).length;
    let matchingLines = 0;
    if (pattern) {
      const regex = new RegExp(pattern, 'g');
      for (const line of lines) {
        regex.lastIndex = 0;
        if (regex.test(line)) matchingLines++;
      }
    }
    return { path, totalLines, nonEmptyLines, matchingLines, pattern: pattern ?? null };
  },
};
