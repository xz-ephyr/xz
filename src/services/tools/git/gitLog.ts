import { z } from 'zod';
import type { ToolDef } from '../types';

export const gitLogTool: ToolDef = {
  name: 'git_log',
  description: 'Show commit logs. Returns recent commit history with hash, author, date, and message.',
  category: 'git',
  inputSchema: z.object({
    repoPath: z.string().describe('Absolute path to the git repository root.'),
    maxCount: z.number().optional().default(20).describe('Maximum number of commits to show.'),
    branch: z.string().optional().describe('Show log for a specific branch (defaults to current branch).'),
    path: z.string().optional().describe('Only show commits that touched this file path.'),
  }),
  execute: async ({ repoPath, maxCount, branch, path }) => {
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    try {
      const res = await fetch(`${backendUrl}/tools`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: 'git_log', params: { repoPath, maxCount, branch, path } }),
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
