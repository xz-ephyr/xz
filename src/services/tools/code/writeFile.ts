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

export const writeFileTool: ToolDef = {
  name: 'write_file',
  description: 'Write content to a file at the specified path. Creates the file if it does not exist, overwrites if it does.',
  category: 'code',
  inputSchema: z.object({
    path: z.string().describe('Absolute path to the file to write.'),
    content: z.string().describe('The full content to write to the file.'),
  }),
  execute: async ({ path, content }) => {
    const mod = await loadFs();
    if (!mod) throw new Error('Filesystem access requires the Tauri desktop app');
    await mod.writeTextFile(path, content);
    return { path, written: content.length, bytes: new TextEncoder().encode(content).length };
  },
};
