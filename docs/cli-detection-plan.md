# CLI Integration — Seamless AI Agent Connection

> **Date:** 2026-06-28  
> **Status:** Planning  
> **Icon:** `ServerIcon`

---

## Motivation

Instead of just detecting CLI binaries, xz should establish persistent connections with installed AI coding agents. This enables:

- **Direct model access**: Use opencode, codex, claude, aider, and other agents' models directly
- **Background operation**: CLIs run silently in background (like opencode desktop)
- **Automatic reconnection**: Re-establish connections on new devices without manual setup
- **Tool calling**: Let xz AI invoke CLI commands as native tools
- **Unified model catalog**: Show all available models from installed CLIs in one place
- **Session persistence**: Continue working across devices via CLI agents

---

## Integration Architecture

### The "Bridge" Pattern

```
┌─────────────────────────────────────────────────────┐
│                 xz Core                            │
├─────────────────────────────────────────────────────┤
│  AI Service                                        │
│  - Unified model adapter                          │
│  - Tool call orchestration                        │
│  - Background process manager                     │
├─────────────────────────────────────────────────────┤
│             CLI Bridge Layer                      │
├─────────────────────────────────────────────────────┤
│  BackgroundBridge   │  ServiceBridge   │  SubprocessBridge │
│  - opencode server  │  - local SDKs    │  - CLI binaries  │
│  - TCP clients      │  - HTTP APIs     │                  │
│  - WebSocket        │                 │                  │
├─────────────────────────────────────────────────────┤
│             Connection Layer                     │
├─────────────────────────────────────────────────────┤
│  - Silent background detection                   │
│  - Automatic reconnection                        │
│  - Auth token exchange                          │
│  - Health monitoring                             │
└─────────────────────────────────────────────────────┘
```

---

## Technical Implementation

### 1. CLI Bridge Service (`src/services/CLIBridgeService.ts`)

```ts
// Unified interface for CLI connections
interface CLIBridge {
  id: string;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  execute(command: string, args?: string[]): Promise<CommandResult>;
  getModels(): Promise<ModelInfo[]>;
  getAuthStatus(): Promise<AuthStatus>;
}

// Main bridge managing all CLI connections
class CLIBridgeService {
  private bridges: Map<string, CLIBridge> = new Map();

  // Register CLI with appropriate bridge
  async connectToCLI(cliType: string): Promise<CLIBridge> {
    switch (cliType) {
      case 'opencode':
        return await this.createOpenCodeBridge();
      case 'codex':
        return await this.createCodexBridge();
      case 'claude':
        return await this.createClaudeBridge();
      case 'aider':
        return await this.createAiderBridge();
      // ... other CLIs
    }
  }

  // Silent background detection (no UI!)
  async detectAndConnect(): Promise<void> {
    // Run on app startup - no visible progress
    const cliTypes = await this.silentDetection();

    for (const cliType of cliTypes) {
      try {
        const bridge = await this.connectToCLI(cliType);
        if (bridge.isConnected()) {
          this.bridges.set(cliType, bridge);
          console.log(`[CLI] Connected to ${cliType}`);
        }
      } catch (error) {
        console.log(`[CLI] Failed to connect to ${cliType}:`, error);
      }
    }
  }
}
```

### 2. OpenCode Integration (Real-world example)

```ts
// Direct connection to opencode server
class OpenCodeBridge implements CLIBridge {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private serverUrl = 'http://localhost:3080';

  async connect(): Promise<void> {
    // Start opencode server if not running
    if (!await this.isServerRunning()) {
      await this.startServer();
    }

    // Connect silently in background
    this.ws = new WebSocket(`ws://${this.serverUrl}/ws`);

    return new Promise((resolve) => {
      this.ws!.onopen = () => {
        this.reconnectAttempts = 0;
        this.setupEventHandlers();
        resolve();
      };

      this.ws!.onerror = () => {
        this.handleReconnect();
      };
    });
  }

  async execute(command: string, args?: string[]): Promise<CommandResult> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Not connected');
    }

    const msg = {
      type: 'execute_command',
      command,
      args,
      request_id: crypto.randomUUID()
    };

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({ success: false, error: 'Timeout' });
      }, 30000);

      const handler = (event: MessageEvent) => {
        const data = JSON.parse(event.data);
        if (data.type === 'command_result') {
          clearTimeout(timeout);
          this.ws!.removeEventListener('message', handler);
          resolve(data);
        }
      };

      this.ws!.addEventListener('message', handler);
      this.ws!.send(JSON.stringify(msg));
    });
  }

  async getModels(): Promise<ModelInfo[]> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return [];
    }

    const msg = {
      type: 'get_models',
      request_id: crypto.randomUUID()
    };

    return new Promise((resolve) => {
      const handler = (event: MessageEvent) => {
        const data = JSON.parse(event.data);
        if (data.type === 'models_list') {
          this.ws!.removeEventListener('message', handler);
          resolve(data.models);
        }
      };

      this.ws!.addEventListener('message', handler);
      this.ws!.send(JSON.stringify(msg));
    });
  }
}
```

### 3. CLI Detection (Silent, Background)

```ts
// Background detection without UI
class BackgroundCLIDetector {
  async detectInstalledCLIs(): Promise<string[]> {
    // Check opencode (running server)
    if (await this.checkOpenCodeServer()) {
      return ['opencode'];
    }

    // Check CLI binaries (no version, just existence)
    const binaries = ['codex', 'claude', 'aider', 'agy'];
    const found = [];

    for (const binary of binaries) {
      if (await this.isBinaryAvailable(binary)) {
        found.push(binary);
      }
    }

    return found;
  }

  // Check if opencode server is running
  private async checkOpenCodeServer(): Promise<boolean> {
    try {
      const response = await fetch('http://localhost:3080/health', {
        method: 'GET',
        signal: AbortSignal.timeout(1000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  // Check if binary exists (simple and fast)
  private async isBinaryAvailable(binary: string): Promise<boolean> {
    try {
      const cmd = process.platform === 'win32' ? 'where' : 'which';

      if (process.platform === 'win32') {
        const result = await execPromise(`${cmd} ${binary}`);
        return result.trim() !== '';
      } else {
        const result = await execPromise(`command -v ${binary}`);
        return result.trim() !== '';
      }
    } catch {
      return false;
    }
  }

  // No UI indicators, just logging
  private log(message: string): void {
    console.log(`[CLI Detection] ${message}`);
  }
}
```

### 4. Tool Adapter for Unified AI Service

```ts
// Make CLI tools available to AI through unified interface
class CLIToolAdapter {
  constructor(private bridge: CLIBridge) {}

  async createToolDefinition(name: string, description: string, examples?: string[]): ToolDefinition {
    return {
      name,
      description,
      inputSchema: {
        type: 'object',
        properties: {
          command: { type: 'string' },
          args: { type: 'array', items: { type: 'string' } }
        }
      },
      execute: async (params: any) => {
        try {
          const result = await this.bridge.execute(params.command, params.args);
          return {
            content: [{ type: 'text', text: result.output }],
            metadata: {
              cli_id: this.bridge.id,
              command: params.command,
              success: result.success
            }
          };
        } catch (error) {
          return {
            content: [{ type: 'text', text: `CLI tool execution failed: ${error}` }],
            isError: true
          };
        }
      }
    };
  }
}
```

### 5. Background Management

```ts
// Manage persistent CLI connections
class BackgroundCLIConnection {
  private detectionInterval: NodeJS.Timeout;
  private reconnectInterval: NodeJS.Timeout;
  private healthInterval: NodeJS.Timeout;

  start() {
    // Detection every 5 minutes (silent)
    this.detectionInterval = setInterval(() => {
      this.checkConnections();
    }, 300000);

    // Reconnect on failure (silent)
    this.reconnectInterval = setInterval(() => {
      this.attemptReconnections();
    }, 60000);

    // Health check every 30 seconds
    this.healthInterval = setInterval(() => {
      this.checkHealth();
    }, 30000);
  }

  private async checkConnections() {
    const detector = new BackgroundCLIDetector();
    const detected = await detector.detectInstalledCLIs();

    // Connect to newly detected CLIs
    for (const cli of detected) {
      if (!this.isConnected(cli)) {
        this.connectSilent(cli);
      }
    }

    // Remove disconnected bridges
    for (const [id] of this.bridges) {
      if (!detected.includes(id) || !this.isHealthy(id)) {
        this.disconnect(id);
      }
    }
  }
}
```

### 6. Configuration Integration

```ts
// Auto-configure models from connected CLIs
class AutoModelConfigurator {
  async configureFromCLIBridges(bridges: Map<string, CLIBridge>): Promise<void> {
    for (const [cliId, bridge] of bridges) {
      try {
        const models = await bridge.getModels();

        for (const model of models) {
          const provider = this.getProviderFromCLI(cliId);
          await this.addModelToSystem(model, provider, {
            source: 'cli',
            cliId: cliId,
            authStatus: await bridge.getAuthStatus()
          });
        }
      } catch (error) {
        console.log(`[Config] Failed to configure ${cliId}:`, error);
      }
    }
  }

  private getProviderFromCLI(cliId: string): string {
    const providerMap: Record<string, string> = {
      'opencode': 'opencode',
      'codex': 'openai',
      'claude': 'anthropic',
      'aider': 'aider',
      'agy': 'google',
    };

    return providerMap[cliId] || 'custom';
  }
}
```

---

## Startup Behavior

### Initial Connection Phase

```ts
// Silent initialization on app load
class XZAppInitializer {
  async initialize(): Promise<void> {
    // Phase 1: Background detection (0-2 seconds, silent)
    console.log('[Init] Starting CLI detection...');
    const detector = new BackgroundCLIDetector();
    const detected = await detector.detectInstalledCLIs();

    // Phase 2: Connect silently
    console.log('[Init] Connecting to detected agents...');
    const bridgeService = new CLIBridgeService();

    for (const cliType of detected) {
      try {
        const bridge = await bridgeService.connectToCLI(cliType);
        console.log(`[Init] Connected to ${cliType}`);
      } catch (error) {
        console.log(`[Init] Failed to connect to ${cliType}:`, error);
      }
    }

    // Phase 3: Auto-configure models
    await this.configureFromConnectedCLIs();

    // Phase 4: Start background maintenance
    this.startBackgroundMaintenance();

    console.log('[Init] Ready - Connected to', detected.length, 'AI agents');
  }
}
```

---

## UI Integration

### Settings Panel (minimal)

```tsx
function CLIBridgesPanel() {
  const [bridges, setBridges] = useState<Map<string, CLIBridge>>(new Map());

  useEffect(() => {
    const service = new CLIBridgeService();

    service.getAllBridges().then(allBridges => {
      setBridges(allBridges);
    });

    const monitor = new BackgroundCLIConnection();
    monitor.start();

    return () => monitor.stop();
  }, []);

  return (
    <div>
      <h3>Connected AI Agents</h3>
      {Array.from(bridges.entries()).map(([id, bridge]) => (
        <CLIConnectionCard
          key={id}
          cliId={id}
          isConnected={bridge.isConnected()}
          modelsCount={bridge.getModelCount()}
          onReconnect={() => bridge.connect()}
          onDisconnect={() => bridge.disconnect()}
        />
      ))}
    </div>
  );
}
```

### Model Picker (unified)

```tsx
function CLIModelPicker({ bridges }: { bridges: Map<string, CLIBridge> }) {
  const [cliModels, setCLIModels] = useState<ModelInfo[]>([]);

  useEffect(() => {
    const loadCLIModels = async () => {
      const allModels: ModelInfo[] = [];

      for (const bridge of bridges.values()) {
        if (bridge.isConnected()) {
          const models = await bridge.getModels();
          allModels.push(...models.map(m => ({
            ...m,
            source: 'cli' as const,
            sourceId: bridge.id
          })));
        }
      }

      setCLIModels(allModels);
    };

    if (bridges.size > 0) {
      loadCLIModels();
    }
  }, [bridges]);

  return (
    <ModelSelector
      models={cliModels}
      groupBy="source"
      customGroups={{
        'cli': 'Installed AI Agents',
        'default': 'Standard Models'
      }}
    />
  );
}
```

---

## Target CLIs & Integration Points

| CLI | Integration Method | Authentication | Key Feature |
|-----|-------------------|----------------|-------------|
| **OpenCode (opencode)** | Connect to local server `localhost:3080` | Session token | Direct model access, background agent |
| **Codex CLI** | Subprocess bridge | API key from config | OpenAI completion, code review |
| **Claude Code** | Subprocess bridge | Auth file | Anthropic models, code understanding |
| **Aider** | Subprocess bridge | Config file | Code editing, git integration |
| **Antigravity CLI** | Subprocess bridge | Env variables | Google models, real-time coding |

---

## Core Principles

- **No UI for CLI detection** — detection is invisible, just logs
- **No version checking** — only binary existence matters
- **Automatic on new devices** — no setup needed
- **Background only** — no terminal window opens
- **Unified model access** — all CLI models in your app's UI
- **Direct tool calling** — xz AI invokes CLI tools as needed

---

## Testing

### Background Detection Tests

```ts
test('Background detector finds opencode', async () => {
  const detector = new BackgroundCLIDetector();
  const detected = await detector.detectInstalledCLIs();
  expect(detected).toContain('opencode');
});

test('Silent connection establishes', async () => {
  const bridge = new OpenCodeBridge();
  await bridge.connect();
  expect(bridge.isConnected()).toBe(true);
});
```

### Integration Tests

```ts
test('All CLI models appear in unified catalog', async () => {
  const service = new CLIBridgeService();
  await service.detectAndConnect();
  const allModels = await service.getAllModels();
  expect(allModels.some(m => m.source === 'cli')).toBe(true);
});
```

---

## Future Enhancements

### Phase 2: CLI Tool Router
Route specific tool calls to the best-suited CLI:

```ts
class CLIToolRouter {
  async routeToolCall(userRequest: string): Promise<ToolCallResult> {
    const { target, command, args } = await this.analyzeRequest(userRequest);
    const cli = await this.findBestCLI(target, command);
    return await cli.execute(command, args);
  }
}
```

### Phase 3: Persistent Sessions
Save and restore CLI sessions across devices:

```ts
class SessionSyncService {
  async saveSession(session: ChatSession): Promise<void> {
    for (const bridge of this.bridges.values()) {
      await bridge.saveSession(session);
    }
  }

  async loadSession(sessionId: string): Promise<ChatSession | null> {
    return this.tryAllCLIs(async bridge => {
      return await bridge.loadSession(sessionId);
    });
  }
}
```

---

## Summary

This approach shifts from **detection** to **integration**:

1. **Silent background detection** — No UI, no waits, no user interaction
2. **Persistent connections** — CLIs stay connected without user awareness
3. **Unified model access** — All CLI models appear in one place
4. **Direct tool execution** — AI calls CLI commands without intermediate UI
5. **Automatic device continuity** — Works on new devices out of box

The result is a seamless experience where xz connects to available CLI agents automatically and lets the user work with all their AI tools through a single interface — just like how opencode desktop works.
