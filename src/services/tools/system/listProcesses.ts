import { z } from 'zod';
import type { ToolDef } from '../types';

export const listProcessesTool: ToolDef = {
  name: 'list_processes',
  description: 'List running system processes. Returns process names and PIDs.',
  category: 'system',
  inputSchema: z.object({}),
  execute: async () => {
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    try {
      const res = await fetch(`${backendUrl}/tools`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: 'list_processes', params: {} }),
      });
      if (!res.ok) throw new Error(`Backend error (${res.status})`);
      return res.json();
    } catch (error: any) {
      if (error.message?.includes('fetch')) {
        throw new Error('Process listing requires the Express backend (http://localhost:3001) or the Tauri desktop app');
      }
      throw error;
    }
  },
};
