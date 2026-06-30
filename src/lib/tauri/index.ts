export const isTauri = (): boolean => {
  return typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__ !== undefined;
};

export const getTauriInternals = () => {
  return (window as any).__TAURI_INTERNALS__;
};
