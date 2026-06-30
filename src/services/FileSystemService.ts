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

// In-memory virtual filesystem for web-browser mode (fallback when no server available)
const webVirtualFS: Record<string, string> = {};

// Restore previously saved files from localStorage on initialisation
try {
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('vfs:')) {
      const path = key.slice(4);
      const content = localStorage.getItem(key);
      if (content !== null) {
        webVirtualFS[path] = content;
      }
    }
  }
} catch {
  // localStorage not available
}

// Recursively read all files from a FileSystemDirectoryHandle
async function readDirectoryHandle(
  dirHandle: FileSystemDirectoryHandle,
  basePath: string,
): Promise<{ path: string; content: string }[]> {
  const results: { path: string; content: string }[] = [];
  for await (const [name, handle] of (dirHandle as any).entries()) {
    const fullPath = basePath + '/' + name;
    if (handle.kind === 'directory') {
      results.push(...await readDirectoryHandle(handle as FileSystemDirectoryHandle, fullPath));
    } else {
      try {
        const file = await (handle as FileSystemFileHandle).getFile();
        results.push({ path: fullPath, content: await file.text() });
      } catch {
        // skip files that can't be read
      }
    }
  }
  return results;
}

// Build a tree structure from a flat list of file paths
function buildTreeFromPaths(paths: string[], basePrefix: string): FileEntry[] {
  const prefix = basePrefix.endsWith('/') ? basePrefix : basePrefix + '/';
  const childNames = new Set<string>();

  for (const p of paths) {
    if (p.startsWith(prefix)) {
      const rest = p.slice(prefix.length);
      const seg = rest.split('/')[0];
      if (seg) childNames.add(seg);
    }
  }

  const result: FileEntry[] = [];
  for (const name of childNames) {
    if (name.startsWith('.') || name === 'node_modules') continue;
    const fullPath = prefix + name;
    const isDirectory = paths.some(p => p.startsWith(fullPath + '/'));
    result.push({
      name,
      path: fullPath,
      isDirectory,
      children: isDirectory ? buildTreeFromPaths(paths, fullPath) : undefined,
    });
  }
  return result;
}

// ------------------------------------------------------------------
// Tauri-only dynamic imports (to avoid crashing in a browser build)
// ------------------------------------------------------------------
const getTauriFs = async () => {
  return import('@tauri-apps/plugin-fs');
};

const getTauriPath = async () => {
  return import('@tauri-apps/api/path');
};

async function getTauriTree(basePath: string, depth: number, projectId?: string): Promise<FileEntry[]> {
  try {
    const { readDir } = await getTauriFs();
    const { join } = await getTauriPath();
    const entries = await readDir(basePath);
    const result: FileEntry[] = [];

    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      const fullPath = await join(basePath, entry.name);
      const isDirectory = entry.isDirectory;
      result.push({
        name: entry.name,
        path: fullPath,
        isDirectory,
        children: isDirectory
          ? await FileSystemService.getTree(fullPath, depth + 1, projectId)
          : undefined,
      });
    }
    return result;
  } catch (e) {
    console.error('Error reading dir:', e);
    return [];
  }
}

async function getProjectTreeFromServer(basePath: string, projectId: string): Promise<FileEntry[]> {
  try {
    const prefix = basePath.endsWith('/') ? basePath : basePath + '/';
    const files = await DatabaseService.getProjectFiles(projectId);
    const paths = files.map(f => f.path);
    return buildTreeFromPaths(paths, prefix);
  } catch (e) {
    console.error('Error reading files from server:', e);
    return [];
  }
}

async function getVirtualTree(basePath: string, depth: number, projectId?: string): Promise<FileEntry[]> {
  try {
    const prefix = basePath.endsWith('/') ? basePath : basePath + '/';
    const childNames = new Set<string>();

    for (const key of Object.keys(webVirtualFS)) {
      if (key.startsWith(prefix)) {
        const rest = key.slice(prefix.length);
        const firstSegment = rest.split('/')[0];
        if (firstSegment) childNames.add(firstSegment);
      }
    }

    const result: FileEntry[] = [];
    for (const name of childNames) {
      if (name.startsWith('.') || name === 'node_modules') continue;
      const fullPath = prefix + name;
      const isDirectory = Object.keys(webVirtualFS).some((k) => k.startsWith(fullPath + '/'));
      result.push({
        name,
        path: fullPath,
        isDirectory,
        children: isDirectory ? await FileSystemService.getTree(fullPath, depth + 1, projectId) : undefined,
      });
    }
    return result;
  } catch (e) {
    console.error('Error reading virtual dir:', e);
    return [];
  }
}

export const FileSystemService = {
  getTree: async (basePath: string, depth = 0, projectId?: string): Promise<FileEntry[]> => {
    if (depth > 20) return [];

    const cached = treeCache.get(basePath);
    if (cached && Date.now() - cached.timestamp < TREE_CACHE_TTL) {
      return cached.result;
    }

    let result: FileEntry[];

    if (isTauri()) {
      result = await getTauriTree(basePath, depth, projectId);
    } else if (projectId) {
      result = await getProjectTreeFromServer(basePath, projectId);
    } else {
      result = await getVirtualTree(basePath, depth, projectId);
    }

    treeCache.set(basePath, { result, timestamp: Date.now() });
    return result;
  },

  getCompressedTree: (tree: FileEntry[]): string => {
    const summarize = (entries: FileEntry[], indent = ''): string => {
      return entries
        .map((e) => {
          if (e.isDirectory) {
            const childrenStr = summarize(e.children || [], indent + '  ');
            return `${indent}${e.name}/\n${childrenStr}`;
          }
          return `${indent}${e.name}`;
        })
        .join('\n');
    };

    return summarize(tree);
  },

  getFileContent: async (path: string, projectId?: string): Promise<string> => {
    if (isTauri()) {
      try {
        const { readFile } = await getTauriFs();
        const uint8Array = await readFile(path);
        return new TextDecoder().decode(uint8Array);
      } catch (e) {
        console.error('Error reading file:', e);
        return '';
      }
    }

    // Web with projectId: fetch from server DB
    if (projectId) {
      try {
        return await DatabaseService.getProjectFileContent(projectId, path);
      } catch (e) {
        console.error('Error reading file from server:', e);
        return '';
      }
    }

    // Web fallback: read from virtual FS
    return webVirtualFS[path] ?? '';
  },

  // Heuristic: check if content looks like binary (null bytes in first 4KB)
  isLikelyBinary: (content: string): boolean => {
    const sample = content.slice(0, 4096);
    for (let i = 0; i < sample.length; i++) {
      if (sample.charCodeAt(i) === 0) return true;
    }
    return false;
  },

  /** Walk the file tree recursively and read file contents with sensible limits. */
  getProjectContent: async (basePath: string, projectId?: string): Promise<ProjectContent> => {
    const MAX_TOTAL_CHARS = 60_000;
    const MAX_FILE_CHARS = 30_000;
    const tree = await FileSystemService.getTree(basePath, 0, projectId);

    const lines: string[] = [];
    const contents: FileContent[] = [];
    let totalChars = 0;
    let skippedBinary = 0;
    let skippedSize = 0;
    let truncated = false;

    const walk = (entries: FileEntry[], indent = '') => {
      for (const entry of entries) {
        lines.push(`${indent}${entry.isDirectory ? '📁' : '📄'} ${entry.name}`);
        if (entry.children) {
          walk(entry.children, indent + '  ');
        }
      }
    };
    walk(tree);

    const readFiles = async (entries: FileEntry[]) => {
      const jobs: Promise<void>[] = [];
      for (const entry of entries) {
        if (entry.isDirectory && entry.children) {
          jobs.push(readFiles(entry.children));
        } else if (!entry.isDirectory) {
          jobs.push((async () => {
            if (totalChars >= MAX_TOTAL_CHARS) { truncated = true; return; }
            const raw = await FileSystemService.getFileContent(entry.path, projectId);
            if (!raw) return;
            if (FileSystemService.isLikelyBinary(raw)) { skippedBinary++; return; }
            if (raw.length > MAX_FILE_CHARS) { skippedSize++; return; }
            totalChars += raw.length;
            if (totalChars > MAX_TOTAL_CHARS) { truncated = true; return; }
            contents.push({ path: entry.path, size: raw.length, text: raw });
          })());
        }
      }
      await Promise.all(jobs);
    };
    await readFiles(tree);

    return {
      tree: lines.join('\n'),
      contents,
      truncated,
      skippedBinary,
      skippedSize,
    };
  },

  importDirectory: async (dirHandle: FileSystemDirectoryHandle, projectId?: string): Promise<string> => {
    const name = dirHandle.name;
    const projectPath = '/web-projects/' + name;

    const files = await readDirectoryHandle(dirHandle, projectPath);

    // Upload to server DB if projectId is available
    if (projectId) {
      try {
        await DatabaseService.saveProjectFiles(projectId, files.map(f => ({ path: f.path, content: f.content })));
        return projectPath;
      } catch (e) {
        console.error('Error uploading files to server:', e);
      }
    }

    // Fallback: store in virtual FS
    webVirtualFS[projectPath + '/'] = '';
    for (const f of files) {
      webVirtualFS[f.path] = f.content;
      try {
        if (f.content.length < 500_000) {
          localStorage.setItem(`vfs:${f.path}`, f.content);
        }
      } catch { /* quota exceeded */ }
    }
    return projectPath;
  },

  /** Upload all files in a project's virtual FS path to the server DB. */
  uploadProjectFiles: async (projectId: string, projectPath: string): Promise<void> => {
    const prefix = projectPath.endsWith('/') ? projectPath : projectPath + '/';
    const files: { path: string; content: string }[] = [];
    for (const key of Object.keys(webVirtualFS)) {
      if (key.startsWith(prefix) && key !== prefix) {
        files.push({ path: key, content: webVirtualFS[key] });
      }
    }
    if (files.length === 0) return;
    await DatabaseService.saveProjectFiles(projectId, files);
    // Clear from localStorage after upload
    for (const f of files) {
      try { localStorage.removeItem(`vfs:${f.path}`); } catch { /* ignore */ }
      delete webVirtualFS[f.path];
    }
  },

  saveFile: async (path: string, content: string, projectId?: string): Promise<void> => {
    clearTreeCache();
    if (isTauri()) {
      try {
        const { writeFile, mkdir } = await getTauriFs();
        const lastSlash = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
        const dirPath = lastSlash !== -1 ? path.substring(0, lastSlash) : '';
        if (dirPath) {
          try {
            await mkdir(dirPath, { recursive: true });
          } catch {
            // Directory may already exist — ignore
          }
        }
        await writeFile(path, new TextEncoder().encode(content));
      } catch (e) {
        console.error('Error writing file:', e);
        throw e;
      }
      return;
    }

    // Web with projectId: save to server DB
    if (projectId) {
      try {
        await DatabaseService.saveProjectFiles(projectId, [{ path, content }]);
        return;
      } catch (e) {
        console.error('Error saving file to server:', e);
      }
    }

    // Web fallback: persist to virtual in-memory FS
    webVirtualFS[path] = content;
    try {
      const storageKey = `vfs:${path}`;
      if (content.length < 500_000) {
        localStorage.setItem(storageKey, content);
      }
    } catch {
      // localStorage quota exceeded — in-memory only
    }
  },
};
