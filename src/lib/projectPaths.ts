import { isTauri } from './tauri';

const normalizeFallbackPath = (path: string): string => {
  const [prefix = '', ...rest] = path.replace(/\\/g, '/').split('/');
  const parts = [prefix, ...rest].filter((part) => part.length > 0 && part !== '.');
  const resolved: string[] = [];

  for (const part of parts) {
    if (part === '..') {
      resolved.pop();
    } else {
      resolved.push(part);
    }
  }

  const hasLeadingSlash = path.startsWith('/') || path.startsWith('\\');
  return `${hasLeadingSlash ? '/' : ''}${resolved.join('/')}` || (hasLeadingSlash ? '/' : '.');
};

export const normalizeProjectPath = async (path: string): Promise<string> => {
  if (isTauri()) {
    const { normalize } = await import('@tauri-apps/api/path');
    return normalize(path);
  }

  return normalizeFallbackPath(path);
};

export const resolveProjectPath = async (
  basePath: string,
  segment: string
): Promise<string | null> => {
  const relativeSegment = segment.replace(/^[/\\]+/, '');
  const joinedPath = isTauri()
    ? await (await import('@tauri-apps/api/path')).join(basePath, relativeSegment)
    : `${basePath.replace(/[/\\]+$/, '')}/${relativeSegment}`;

  const normalizedBase = (await normalizeProjectPath(basePath)).replace(/[/\\]+$/, '');
  const normalizedJoined = await normalizeProjectPath(joinedPath);

  if (normalizedJoined === normalizedBase || normalizedJoined.startsWith(`${normalizedBase}/`)) {
    return joinedPath;
  }

  return null;
};
