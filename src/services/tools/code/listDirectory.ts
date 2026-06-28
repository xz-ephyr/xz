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

export const listDirectoryTool: ToolDef = {
  name: 'list_directory',
  description: 'List the contents of a directory. Returns files and subdirectories with their types.',
  category: 'code',
  inputSchema: z.object({
    path: z.string().describe('Absolute path to the directory to list.'),
    recursive: z.boolean().optional().default(false).describe('Whether to list contents recursively.'),
  }),
  execute: async ({ path, recursive }) => {
    const mod = await loadFs();
    if (!mod) throw new Error('Filesystem access requires the Tauri desktop app');
    const fs = mod;

    async function list(dir: string, depth: number): Promise<any[]> {
      const entries = await fs.readDir(dir);
      const results: any[] = [];
      for (const entry of entries) {
        const fullPath = `${dir}/${entry.name}`;
        results.push({ name: entry.name, path: fullPath, isDirectory: entry.isDirectory, isFile: entry.isFile, isSymlink: entry.isSymlink });
        if (recursive && entry.isDirectory && depth < 10) {
          results.push(...await list(fullPath, depth + 1));
        }
      }
      return results;
    }

    const entries = await list(path, 0);
    return { path, entries, count: entries.length };
  },
};
