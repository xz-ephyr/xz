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

export const fileStatsTool: ToolDef = {
  name: 'file_stats',
  description: 'Get metadata and statistics for a file or directory at the specified path.',
  category: 'code',
  inputSchema: z.object({
    path: z.string().describe('Absolute path to the file or directory.'),
  }),
  execute: async ({ path }) => {
    const mod = await loadFs();
    if (!mod) throw new Error('Filesystem access requires the Tauri desktop app');
    const info = await mod.stat(path);
    return {
      path,
      isFile: info.isFile,
      isDirectory: info.isDirectory,
      isSymlink: info.isSymlink,
      size: info.size,
      readonly: info.readonly,
      modifiedAt: info.mtime?.toISOString() ?? null,
      accessedAt: info.atime?.toISOString() ?? null,
      createdAt: info.birthtime?.toISOString() ?? null,
    };
  },
};
