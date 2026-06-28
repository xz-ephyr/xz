import { z } from 'zod';
import type { ToolDef } from '../types';

export const gitBranchesTool: ToolDef = {
  name: 'git_branches',
  description: 'List all branches in the repository. Returns local and remote branches with their latest commit info.',
  category: 'git',
  inputSchema: z.object({
    repoPath: z.string().describe('Absolute path to the git repository root.'),
    remote: z.boolean().optional().default(false).describe('Include remote branches.'),
  }),
  execute: async ({ repoPath, remote }) => {
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    try {
      const res = await fetch(`${backendUrl}/tools`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: 'git_branches', params: { repoPath, remote } }),
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
