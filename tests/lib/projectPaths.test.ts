import { describe, expect, it, vi } from 'vitest';

vi.mock('../../src/lib/tauri', () => ({
  isTauri: () => false,
}));

const { resolveProjectPath } = await import('../../src/lib/projectPaths');

describe('resolveProjectPath', () => {
  it('resolves a normal project-relative path', async () => {
    await expect(resolveProjectPath('/workspace/project', 'src/App.tsx')).resolves.toBe(
      '/workspace/project/src/App.tsx'
    );
  });

  it('removes leading slashes without treating paths as absolute', async () => {
    await expect(resolveProjectPath('/workspace/project', '/src/App.tsx')).resolves.toBe(
      '/workspace/project/src/App.tsx'
    );
  });

  it('rejects parent directory traversal outside the project', async () => {
    await expect(resolveProjectPath('/workspace/project', '../secrets.txt')).resolves.toBeNull();
  });

  it('rejects traversal when the destination only shares a project path prefix', async () => {
    await expect(
      resolveProjectPath('/workspace/project', '../project-eject/file.ts')
    ).resolves.toBeNull();
  });
});
