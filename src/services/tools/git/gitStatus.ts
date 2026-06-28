import { z } from 'zod';
import type { ToolDef } from '../types';

export const gitStatusTool: ToolDef = {
  name: 'git_status',
  description: 'Show the working tree status. Returns staged, unstaged, and untracked changes in the git repository.',
  category: 'git',
  inputSchema: z.object({
    repoPath: z.string().describe('Absolute path to the git repository root.'),
  }),
  execute: async ({ repoPath }) => {
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    try {
      const res = await fetch(`${backendUrl}/tools`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: 'git_status', params: { repoPath } }),
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
