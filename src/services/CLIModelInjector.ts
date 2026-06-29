import type { ModelInfo, CLIBridge } from '../types/cli';

const STORAGE_KEY = 'raw-code-cli-models';

type Listener = (models: ModelInfo[]) => void;

class CLIModelInjectorImpl {
  private injected = new Map<string, ModelInfo[]>();
  private listeners = new Set<Listener>();

  onModelsChange(cb: Listener): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify() {
    const all = this.getAll();
    this.listeners.forEach((cb) => cb(all));
  }

  async selectCLI(bridge: CLIBridge): Promise<void> {
    const models = (await bridge.getModels()).filter((m) => m.free);
    this.injected.set(bridge.id, models);
    this.persist();
    this.notify();
  }

  deselectCLI(cliId: string) {
    this.injected.delete(cliId);
    this.persist();
    this.notify();
  }

  getAll(): ModelInfo[] {
    return Array.from(this.injected.values()).flat();
  }

  isSelected(cliId: string): boolean {
    return this.injected.has(cliId);
  }

  private persist() {
    try {
      const obj: Record<string, ModelInfo[]> = {};
      for (const [key, models] of this.injected) {
        obj[key] = models;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
    } catch { /* ignore */ }
  }

  loadPersisted() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const obj = JSON.parse(raw);
      for (const [key, models] of Object.entries(obj)) {
        this.injected.set(key, models as ModelInfo[]);
      }
      this.notify();
    } catch { /* ignore */ }
  }
}

export const CLIModelInjector = new CLIModelInjectorImpl();
