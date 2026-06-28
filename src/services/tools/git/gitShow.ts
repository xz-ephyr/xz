import { z } from 'zod';
import type { ToolDef } from '../types';

export const gitShowTool: ToolDef = {
  name: 'git_show',
  description: 'Show the details of a specific commit, tag, or tree object. Returns full diff and metadata.',
  category: 'git',
  inputSchema: z.object({
    repoPath: z.string().describe('Absolute path to the git repository root.'),
    object: z.string().describe('The git object to show (e.g. commit hash "a1b2c3d", branch name "main", tag "v1.0").'),
  }),
  execute: async ({ repoPath, object }) => {
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    try {
      const res = await fetch(`${backendUrl}/tools`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: 'git_show', params: { repoPath, object } }),
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
