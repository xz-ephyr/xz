import { z } from 'zod';
import type { ToolDef } from '../types';

export const runCommandTool: ToolDef = {
  name: 'run_command',
  description: 'Execute a shell command and return its output. Use for running tests, builds, linters, or any CLI tool.',
  category: 'system',
  inputSchema: z.object({
    command: z.string().describe('The shell command to execute (e.g. "npm test", "go build ./...", "python script.py").'),
    workdir: z.string().optional().describe('Working directory for the command. Defaults to the project root.'),
    timeout: z.number().optional().default(30000).describe('Timeout in milliseconds.'),
  }),
  execute: async ({ command, workdir, timeout }) => {
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    try {
      const res = await fetch(`${backendUrl}/tools`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: 'run_command', params: { command, workdir, timeout } }),
      });
      if (!res.ok) throw new Error(`Backend error (${res.status})`);
      return res.json();
    } catch (error: any) {
      if (error.message?.includes('fetch')) {
        throw new Error('Command execution requires the Express backend (http://localhost:3001) or the Tauri desktop app');
      }
      throw error;
    }
  },
};
