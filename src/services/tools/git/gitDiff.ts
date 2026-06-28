import { z } from 'zod';
import type { ToolDef } from '../types';

export const gitDiffTool: ToolDef = {
  name: 'git_diff',
  description: 'Show changes between commits, commit and working tree, or two specific paths. Returns unified diff output.',
  category: 'git',
  inputSchema: z.object({
    repoPath: z.string().describe('Absolute path to the git repository root.'),
    target: z.string().optional().describe('Git revision, path, or range to diff against (e.g. "HEAD", "HEAD~3", "main"). Defaults to unstaged changes.'),
    staged: z.boolean().optional().default(false).describe('Show staged (cached) changes instead of unstaged.'),
    path: z.string().optional().describe('Only show diff for a specific file path.'),
  }),
  execute: async ({ repoPath, target, staged, path }) => {
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    try {
      const res = await fetch(`${backendUrl}/tools`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: 'git_diff', params: { repoPath, target, staged, path } }),
      });
      if (!res.ok) throw new Error(`Backend error (${res.status})`);
      return res.json();
    } catch (error: any) {
      if (error.message?.includes('fetch')) {
        throw new Error('Git tools require the Express backend to be running (http://localhost:3001) or the Tauri desktop app');
      }
      throw error;
    }
  },
};
