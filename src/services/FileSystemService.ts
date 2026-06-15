// @ts-ignore
import { readDir, readFile, writeFile, mkdir } from '@tauri-apps/plugin-fs';
// @ts-ignore
import { join } from '@tauri-apps/api/path';

export interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileEntry[];
}

export const FileSystemService = {
  getTree: async (basePath: string, depth = 0): Promise<FileEntry[]> => {
    if (depth > 5) return []; // Limit depth for tree summary
    try {
      const entries = await readDir(basePath);
      const result: FileEntry[] = [];

      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;

        const fullPath = await join(basePath, entry.name);
        const isDirectory = entry.isDirectory;

        result.push({
          name: entry.name,
          path: fullPath,
          isDirectory,
          children: isDirectory ? await FileSystemService.getTree(fullPath, depth + 1) : undefined
        });
      }
      return result;
    } catch (e) {
      console.error('Error reading dir:', e);
      return [];
    }
  },

  // Highly compressed tree for AI context (< 100 tokens target)
  getCompressedTree: (tree: FileEntry[]): string => {
    const summarize = (entries: FileEntry[], indent = ''): string => {
      return entries.map(e => {
        if (e.isDirectory) {
          const childrenStr = summarize(e.children || [], indent + '  ');
          return `${indent}${e.name}/\n${childrenStr}`;
        }
        return `${indent}${e.name}`;
      }).join('\n');
    };

    const fullTree = summarize(tree);
    // If too long, we might need more aggressive compression, but let's start here
    return fullTree.split('\n').slice(0, 50).join('\n'); // Safety limit
  },

  getFileContent: async (path: string): Promise<string> => {
    try {
      const uint8Array = await readFile(path);
      return new TextDecoder().decode(uint8Array);
    } catch (e) {
      console.error('Error reading file:', e);
      return '';
    }
  },

  saveFile: async (path: string, content: string): Promise<void> => {
    try {
      // Ensure directory exists
      const lastSlash = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
      const dirPath = lastSlash !== -1 ? path.substring(0, lastSlash) : '';

      if (dirPath) {
          try { await mkdir(dirPath, { recursive: true }); } catch(e) {}
      }
      await writeFile(path, new TextEncoder().encode(content));
    } catch (e) {
      console.error('Error writing file:', e);
      throw e;
    }
  }
};
