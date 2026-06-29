import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isTauri } from '../src/lib/tauri';

describe('isTauri', () => {
  beforeEach(() => {
    vi.stubGlobal('window', undefined);
  });

  it('returns false when window is undefined', () => {
    expect(isTauri()).toBe(false);
  });

  it('returns false when __TAURI_INTERNALS__ is undefined', () => {
    vi.stubGlobal('window', {});
    expect(isTauri()).toBe(false);
  });

  it('returns true when __TAURI_INTERNALS__ exists', () => {
    vi.stubGlobal('window', { __TAURI_INTERNALS__: {} });
    expect(isTauri()).toBe(true);
  });
});
