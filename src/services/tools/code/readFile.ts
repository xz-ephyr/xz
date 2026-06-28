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

export const readFileTool: ToolDef = {
  name: 'read_file',
  description: 'Read the entire contents of a file at the specified path. Returns the content as a string along with file metadata.',
  category: 'code',
  inputSchema: z.object({
    path: z.string().describe('Absolute path to the file to read.'),
  }),
  execute: async ({ path }) => {
    const mod = await loadFs();
    if (!mod) throw new Error('Filesystem access requires the Tauri desktop app');
    const content = await mod.readTextFile(path);
    return { path, content, length: content.length, lines: content.split('\n').length };
  },
};
