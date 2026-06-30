import { isTauri } from '../lib/tauri';
import { DatabaseService } from './DatabaseService';

export interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileEntry[];
}

export interface FileContent {
  path: string;
  size: number;
  text: string;
}

export interface ProjectContent {
  tree: string;
  contents: FileContent[];
  truncated: boolean;
  skippedBinary: number;
  skippedSize: number;
}

const treeCache = new Map<string, { result: FileEntry[]; timestamp: number }>();
const TREE_CACHE_TTL = 2_000;

function clearTreeCache() {
  treeCache.clear();
}

const webVirtualFS: Record<string, string> = {};

try {
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('vfs:')) {
      const path = key.slice(4);
      const content = localStorage.getItem(key);
      if (content !== null) webVirtualFS[path] = content;
    }
  }
} catch { /* ignore */ }

async function readDirectoryHandle(dirHandle: FileSystemDirectoryHandle, basePath: string): Promise<{ path: string; content: string }[]> {
  const results: { path: string; content: string }[] = [];
  for await (const [name, handle] of (dirHandle as any).entries()) {
    const fullPath = basePath + '/' + name;
    if (handle.kind === 'directory') {
      results.push(...await readDirectoryHandle(handle as FileSystemDirectoryHandle, fullPath));
    } else {
      try {
        const file = await (handle as FileSystemFileHandle).getFile();
        results.push({ path: fullPath, content: await file.text() });
      } catch { /* skip */ }
    }
  }
  return results;
}

function buildTreeFromPaths(paths: string[], basePrefix: string): FileEntry[] {
  const prefix = basePrefix.endsWith('/') ? basePrefix : basePrefix + '/';
  const childNames = new Set<string>();
  for (const p of paths) {
    if (p.startsWith(prefix)) {
      const seg = p.slice(prefix.length).split('/')[0];
      if (seg) childNames.add(seg);
    }
  }
  return Array.from(childNames).map(name => {
    const fullPath = prefix + name;
    const isDirectory = paths.some(p => p.startsWith(fullPath + '/'));
    return {
      name,
      path: fullPath,
      isDirectory,
      children: isDirectory ? buildTreeFromPaths(paths, fullPath) : undefined,
    };
  });
}

const getTauriFs = () => import('@tauri-apps/plugin-fs');
const getTauriPath = () => import('@tauri-apps/api/path');

async function getTauriTree(basePath: string, depth: number): Promise<FileEntry[]> {
  const { readDir } = await getTauriFs();
  const { join } = await getTauriPath();
  const entries = await readDir(basePath);
  const result: FileEntry[] = [];
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const fullPath = await join(basePath, entry.name);
    result.push({
      name: entry.name,
      path: fullPath,
      isDirectory: entry.isDirectory,
      children: entry.isDirectory ? await FileSystemService.getTree(fullPath, depth + 1) : undefined,
    });
  }
  return result;
}

export const FileSystemService = {
  getTree: async (basePath: string, depth = 0, projectId?: string): Promise<FileEntry[]> => {
    if (depth > 20) return [];
    const cached = treeCache.get(basePath);
    if (cached && Date.now() - cached.timestamp < TREE_CACHE_TTL) return cached.result;

    let result: FileEntry[] = [];
    if (isTauri()) {
      result = await getTauriTree(basePath, depth);
    } else if (projectId) {
      const files = await DatabaseService.getProjectFiles(projectId);
      result = buildTreeFromPaths(files.map(f => f.path), basePath);
    } else {
      const prefix = basePath.endsWith('/') ? basePath : basePath + '/';
      const paths = Object.keys(webVirtualFS).filter(k => k.startsWith(prefix));
      result = buildTreeFromPaths(paths, basePath);
    }
    treeCache.set(basePath, { result, timestamp: Date.now() });
    return result;
  },

  getFileContent: async (path: string, projectId?: string): Promise<string> => {
    if (isTauri()) {
      const { readFile } = await getTauriFs();
      return new TextDecoder().decode(await readFile(path));
    }
    return projectId ? DatabaseService.getProjectFileContent(projectId, path) : webVirtualFS[path] ?? '';
  },

  isLikelyBinary: (content: string): boolean => {
    const sample = content.slice(0, 4096);
    for (let i = 0; i < sample.length; i++) if (sample.charCodeAt(i) === 0) return true;
    return false;
  },

  getProjectContent: async (basePath: string, projectId?: string): Promise<ProjectContent> => {
    const MAX_TOTAL_CHARS = 60_000;
    const MAX_FILE_CHARS = 30_000;
    const tree = await FileSystemService.getTree(basePath, 0, projectId);
    const contents: FileContent[] = [];
    const lines: string[] = [];
    let totalChars = 0, skippedBinary = 0, skippedSize = 0, truncated = false;

    const walk = (entries: FileEntry[], indent = '') => {
      for (const entry of entries) {
        lines.push(`${indent}${entry.isDirectory ? '📁' : '📄'} ${entry.name}`);
        if (entry.children) walk(entry.children, indent + '  ');
      }
    };
    walk(tree);

    const processFiles = async (entries: FileEntry[]) => {
      for (const entry of entries) {
        if (entry.isDirectory && entry.children) {
          await processFiles(entry.children);
        } else if (!entry.isDirectory) {
          if (totalChars >= MAX_TOTAL_CHARS) { truncated = true; break; }
          const raw = await FileSystemService.getFileContent(entry.path, projectId);
          if (!raw) continue;
          if (FileSystemService.isLikelyBinary(raw)) { skippedBinary++; continue; }
          if (raw.length > MAX_FILE_CHARS) { skippedSize++; continue; }
          totalChars += raw.length;
          if (totalChars > MAX_TOTAL_CHARS) { truncated = true; break; }
          contents.push({ path: entry.path, size: raw.length, text: raw });
        }
      }
    };
    await processFiles(tree);

    return { tree: lines.join('\n'), contents, truncated, skippedBinary, skippedSize };
  },

  importDirectory: async (dirHandle: FileSystemDirectoryHandle, projectId?: string): Promise<string> => {
    const projectPath = '/web-projects/' + dirHandle.name;
    const files = await readDirectoryHandle(dirHandle, projectPath);
    if (projectId) {
      await DatabaseService.saveProjectFiles(projectId, files);
    } else {
      for (const f of files) {
        webVirtualFS[f.path] = f.content;
        if (f.content.length < 500_000) localStorage.setItem(`vfs:${f.path}`, f.content);
      }
    }
    return projectPath;
  },

  uploadProjectFiles: async (projectId: string, projectPath: string): Promise<void> => {
    const prefix = projectPath.endsWith('/') ? projectPath : projectPath + '/';
    const files = Object.keys(webVirtualFS).filter(k => k.startsWith(prefix) && k !== prefix).map(k => ({ path: k, content: webVirtualFS[k] }));
    if (files.length === 0) return;
    await DatabaseService.saveProjectFiles(projectId, files);
    files.forEach(f => { localStorage.removeItem(`vfs:${f.path}`); delete webVirtualFS[f.path]; });
  },

  saveFile: async (path: string, content: string, projectId?: string): Promise<void> => {
    clearTreeCache();
    if (isTauri()) {
      const { writeFile, mkdir } = await getTauriFs();
      const lastSlash = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
      if (lastSlash !== -1) await mkdir(path.substring(0, lastSlash), { recursive: true }).catch(() => {});
      await writeFile(path, new TextEncoder().encode(content));
    } else if (projectId) {
      await DatabaseService.saveProjectFiles(projectId, [{ path, content }]);
    } else {
      webVirtualFS[path] = content;
      if (content.length < 500_000) localStorage.setItem(`vfs:${path}`, content);
    }
  },
};
