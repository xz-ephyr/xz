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

export const editFileTool: ToolDef = {
  name: 'edit_file',
  description: 'Search for a string in a file and replace it with a new string. Provides the diff summary of changes made.',
  category: 'code',
  inputSchema: z.object({
    path: z.string().describe('Absolute path to the file to edit.'),
    oldString: z.string().describe('The exact text to search for in the file. Must match exactly including whitespace.'),
    newString: z.string().describe('The text to replace oldString with.'),
  }),
  execute: async ({ path, oldString, newString }) => {
    const mod = await loadFs();
    if (!mod) throw new Error('Filesystem access requires the Tauri desktop app');
    const content = await mod.readTextFile(path);
    if (!content.includes(oldString)) {
      throw new Error(`Could not find "${oldString}" in the file at "${path}". Check for exact whitespace match.`);
    }
    const newContent = content.replace(oldString, newString);
    const replacements = (content.match(new RegExp(oldString.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    await mod.writeTextFile(path, newContent);
    return {
      path,
      replacements,
      diff: { oldLength: oldString.length, newLength: newString.length, netChange: newString.length - oldString.length },
    };
  },
};
