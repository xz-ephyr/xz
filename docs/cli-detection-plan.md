# CLI Integration — Seamless AI Agent Connection

> **Date:** 2026-06-28  
> **Status:** Planning  
> **Icon:** `ServerIcon`

---

## Motivation

Instead of just detecting CLI binaries, raw-code should establish persistent connections with installed AI coding agents. This enables:

- **Direct model access**: Use opencode, codex, claude, aider, and other agents' models directly
- **Background operation**: CLIs run silently in background (like opencode desktop)
- **Automatic reconnection**: Re-establish connections on new devices without manual setup
- **Tool calling**: Let raw-code AI invoke CLI commands as native tools
- **Unified model catalog**: Show all available models from installed CLIs in one place
- **Session persistence**: Continue working across devices via CLI agents

---

## Integration Architecture

### The "Bridge" Pattern

```
┌─────────────────────────────────────────────────────┐
│                 raw-code Core                            │
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

### 3. Passive Connection (No Detection, No Polling)

No health checks, no timeouts, no polling intervals. The bridge just opens a WebSocket to the CLI server. If the server is running, the connection succeeds. If it's not, the WebSocket stays in a connecting state and auto-reconnects when the server appears. That's it.

```ts
// No polling, no timeouts, no health checks.
// The bridge just opens a WebSocket — when the server appears,
// the connection succeeds. When it goes away, it reconnects.
class OpenCodeBridge implements CLIBridge {
  private ws: WebSocket | null = null;

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket('ws://localhost:3080/ws');
      this.ws.onopen = () => resolve();
      this.ws.onerror = () => reject(new Error('Connection failed'));
      this.ws.onclose = () => setTimeout(() => this.connect(), 2000);
    });
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

No intervals, no health polling. The WebSocket handles everything:

- **Connection**: When the WebSocket opens, the bridge is active.
- **Disconnection**: When the WebSocket closes, it auto-reconnects in 2 seconds.
- **Reconnection**: Indefinite — no max attempt limit, no backoff cap.
- **Health**: Not polled. If the WebSocket is open, the CLI is alive.

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
// Just try to open a WebSocket — no detection, no polling, no timeouts
const bridge = new OpenCodeBridge();
bridge.connect().then(() => {
  console.log('[CLI] Connected to opencode');
});
// If the server isn't running yet, the WebSocket will connect when it appears.
```

---

## UI Integration

### Connected CLI Icons (Above Chat Input)

Detected CLIs appear as a stack of icons beside the greeting text, positioned above the chat input. Each icon represents a connected CLI agent. Clicking an icon expands it into a pill showing the icon + name. Clicking again collapses it back.

```
┌──────────────────────────────────────────────────────┐
│  ┌──────────────────────────────────────────┐       │
│  │  What can I help you build today?        │       │
│  │                                          │       │
│  │  ┌──────┐                                │       │
│  │  │ ○ ○ ○│  ← icon stack (collapsed)      │       │
│  │  └──────┘                                │       │
│  │                                          │       │
│  │  ┌──────┐  ┌──────────┐  ┌──────────┐    │       │
│  │  │ ○ ○ ○│  │ ○ opencode│  │ ○ codex  │    │       │
│  │  └──────┘  └──────────┘  └──────────┘    │       │
│  │   collapsed     expanded                  │       │
│  └──────────────────────────────────────────┘       │
│  ┌──────────────────────────────────────────────┐   │
│  │  Type a message...                      [→]  │   │
│  └──────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

```tsx
function ConnectedCLIIcons({ bridges }: { bridges: CLIBridge[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (bridges.length === 0) return null;

  return (
    <div className="relative flex items-center gap-1">
      {/* Collapsed: stack of icons */}
      <div className="flex -space-x-1.5">
        {bridges.slice(0, 3).map(b => (
          <button
            key={b.id}
            onClick={() => setExpandedId(expandedId === b.id ? null : b.id)}
            className="w-6 h-6 rounded-full bg-neutral-100 border border-white flex items-center justify-center text-xs hover:bg-neutral-200 transition-all"
            title={b.id}
          >
            <CLIIcon cliId={b.id} />
          </button>
        ))}
        {bridges.length > 3 && (
          <span className="w-6 h-6 rounded-full bg-neutral-100 border border-white flex items-center justify-center text-[10px] text-neutral-500 font-medium">
            +{bridges.length - 3}
          </span>
        )}
      </div>

      {/* Expanded: pill with icon + name */}
      {expandedId && (
        <div className="flex gap-1 animate-in fade-in slide-in-from-left-1">
          {bridges.map(b => (
            <span
              key={b.id}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border transition-all cursor-default ${
                b.id === expandedId
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-neutral-50 border-neutral-200 text-neutral-600'
              }`}
            >
              <CLIIcon cliId={b.id} />
              {b.id}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Placement

```
┌─────────────────────────────────────────────────┐
│  ┌──────────────────────────────────────────┐   │
│  │  raw-code (logo)                                │   │
│  │                                           │   │
│  │  What can I help you build today?         │   │
│  │                                           │   │
│  │  [○  ○  ○]   ← icon stack              │   │
│  │  ───or expanded───                       │   │
│  │  [○ opencode] [○ codex] [○ aider]        │   │
│  │                                           │   │
│  │  ┌────────────────────────────────────┐   │   │
│  │  │ Type a message...            [→]  │   │   │
│  │  └────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

### Behavior

- On mount, icons appear collapsed (stacked, only icons visible)
- Click any icon → stack expands into labeled pills (icon + name)
- Click the same icon again or click outside → collapses back to icon stack
- Hover tooltip on collapsed icons shows the CLI name
- Connected status shown via a small green dot on the icon
- Icons for apps like opencode, codex, aider, claude, agy use their brand icons

### Model Injection

When a CLI is selected from the stack (expanded + clicked), its free models are injected into the app:

- **Chat model list** — CLI's free models appear in the model dropdown beside the send button, grouped under a "Connected CLI" section
- **Settings AI listing** — same models appear in Settings → AI Models, marked with the CLI's icon and a "free" badge
- **Only free models** — the bridge filters out paid/pro-tier models from the CLI; the `getModels()` call returns only `{ free: true }` entries
- **On deselect** — models are removed from both lists when the CLI is disconnected or deselected

```ts
interface ModelInfo {
  id: string;
  name: string;
  free: boolean;        // ← only free models are injected
  provider: string;
  source: 'cli';
  cliId: string;
}

class CLIModelInjector {
  private injectedModels: Map<string, ModelInfo[]> = new Map();

  selectCLI(bridge: CLIBridge) {
    const models = (await bridge.getModels()).filter(m => m.free);
    this.injectedModels.set(bridge.id, models);
    this.publishToModelList(models);       // Chat model dropdown
    this.publishToSettingsListing(models);  // Settings → AI Models
  }

  deselectCLI(cliId: string) {
    const models = this.injectedModels.get(cliId) || [];
    this.removeFromModelList(models);
    this.removeFromSettingsListing(models);
    this.injectedModels.delete(cliId);
  }
}
```

```
┌─────────────────────────────────────────────────┐
│  Model Selector (chat input)                    │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │  ◉ gemini-3.5-flash               ▼    │   │
│  ├─────────────────────────────────────────┤   │
│  │  Connected CLI                          │   │
│  │    ○ opencode/deepseek-v4-flash-free    │   │
│  │    ○ opencode/mimo-v2.5-free            │   │
│  │    ○ opencode/big-pickle                │   │
│  ├─────────────────────────────────────────┤   │
│  │  Google                                 │   │
│  │    ○ gemini-3.5-flash                   │   │
│  │    ...                                  │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  Settings → AI Models                           │
│  ┌─────────────────────────────────────────┐   │
│  │  opencode connected         3 models    │   │
│  │  ┌──────────────────────────────────┐   │   │
│  │  │ ○ deepseek-v4-flash-free  [free] │   │   │
│  │  │ ○ mimo-v2.5-free          [free] │   │   │
│  │  │ ○ big-pickle              [free] │   │   │
│  │  └──────────────────────────────────┘   │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

Only `{ free: true }` models from each connected CLI are surfaced — no paid tier models appear in the lists.

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

## Web Mode

When raw-code runs in a browser (dev mode or web app), shell access is unavailable — no `which`, no subprocess spawning. Here's what works and what doesn't:

### What Works in Web Mode

| CLI | Bridge Type | Works in Web? | Reason |
|-----|-------------|---------------|--------|
| **OpenCode** | WebSocket to `localhost:3080` | ✅ | Pure HTTP/WS — works in any browser |
| **Other CLIs via opencode proxy** | Routed through opencode | ✅ | Opencode server forwards to subprocesses |
| **Codex, Claude, Aider, etc.** | Direct subprocess | ❌ | Browser cannot spawn native processes |

### Strategy 1: OpenCode as Proxy (Recommended)

If opencode is running locally, use it as a router — it spawns the other CLIs on your behalf:

```
┌──────────────────────────────────────────────────┐
│                  Browser (Web Mode)              │
│  raw-code Web App                                     │
│    ↓                                            │
│  fetch('http://localhost:3080/api/v1/...')      │
├──────────────────────────────────────────────────┤
│                  OpenCode Server                 │
│    ↓                                            │
│  spawn('codex', [...args])                      │
│  spawn('claude', [...args])                     │
│  spawn('aider', [...args])                      │
└──────────────────────────────────────────────────┘
```

```ts
// Web-mode bridge that proxies through opencode
class WebOpenCodeProxyBridge implements CLIBridge {
  private baseUrl = 'http://localhost:3080';

  async connect(): Promise<void> {
    // Same as OpenCodeBridge but HTTP-only (no WebSocket needed)
    const res = await fetch(`${this.baseUrl}/health`);
    if (!res.ok) throw new Error('OpenCode server not available');
  }

  async execute(command: string, args?: string[]): Promise<CommandResult> {
    const res = await fetch(`${this.baseUrl}/api/v1/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool: command, args })
    });
    return res.json();
  }

  async getModels(): Promise<ModelInfo[]> {
    const res = await fetch(`${this.baseUrl}/api/v1/models`);
    return res.json();
  }
}

// Web-mode detector — no shell commands, only HTTP checks
class WebBackgroundCLIDetector {
  async detectInstalledCLIs(): Promise<string[]> {
    const found: string[] = [];

    // HTTP-based detection only
    if (await this.checkOpenCodeServer()) {
      found.push('opencode');
      // opencode can report what other CLIs it can proxy
      const proxied = await this.getProxiedCLIs();
      found.push(...proxied);
    }

    return found;
  }

  private async checkOpenCodeServer(): Promise<boolean> {
    try {
      const res = await fetch('http://localhost:3080/health', {
        signal: AbortSignal.timeout(1000)
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  private async getProxiedCLIs(): Promise<string[]> {
    try {
      const res = await fetch('http://localhost:3080/api/v1/available-tools', {
        signal: AbortSignal.timeout(1000)
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.tools || [];
    } catch {
      return [];
    }
  }
}
```

### Strategy 2: Companion Daemon (Standalone)

Bundle a lightweight HTTP daemon (a single binary, ~2MB) that runs as a background process alongside the browser:

```
raw-code-daemon.exe / raw-code-daemon
  - Listens on localhost:9300
  - Exposes REST API for CLI detection and execution
  - Spawns CLIs as subprocesses
  - Returns results as JSON
```

```ts
class CompanionDaemonBridge implements CLIBridge {
  private daemonUrl = 'http://localhost:9300';

  async connect(): Promise<void> {
    const res = await fetch(`${this.daemonUrl}/health`, {
      signal: AbortSignal.timeout(2000)
    });
    if (!res.ok) throw new Error('Daemon not running');
  }

  async execute(command: string, args?: string[]): Promise<CommandResult> {
    const res = await fetch(`${this.daemonUrl}/exec`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ binary: command, args })
    });
    return res.json();
  }

  async getModels(): Promise<ModelInfo[]> {
    const res = await fetch(`${this.daemonUrl}/models`);
    return res.json();
  }

  async getAuthStatus(): Promise<AuthStatus> {
    const res = await fetch(`${this.daemonUrl}/auth`);
    return res.json();
  }
}
```

### Strategy 3: localStorage Fallback

Manual declaration for users who want CLI features but run purely in browser:

```ts
const CLI_DECLARATION_KEY = 'raw-code-declared-clis';

class LocalStorageBridge implements CLIBridge {
  async connect(): Promise<void> {
    // No-op — user declared these exist
  }

  async getModels(): Promise<ModelInfo[]> {
    const declared = localStorage.getItem(CLI_DECLARATION_KEY);
    if (!declared) return [];
    return JSON.parse(declared).models || [];
  }

  async execute(): Promise<CommandResult> {
    return { success: false, error: 'Browser cannot execute CLIs. Install the desktop app or opencode server.' };
  }
}
```

The user can add a JSON block in settings:
```json
{
  "opencode": {
    "server": "http://localhost:3080",
    "models": ["deepseek-v4-flash-free", "gemini-3.5-flash"]
  }
}
```

### Detection Logic

```ts
function createBridgeService(): CLIBridgeService {
  const service = new CLIBridgeService();

  if (isDesktopApp()) {
    // Desktop: full shell access
    service.registerDetector(new BackgroundCLIDetector());
  } else if (await opencodeServerRunning()) {
    // Web + opencode server running
    service.registerDetector(new WebBackgroundCLIDetector());
  } else {
    // Pure web: only localStorage
    service.registerDetector(new LocalStorageDetector());
  }

  return service;
}
```

---

## Operational Concerns

### Process Lifecycle

CLIs need proper lifecycle management — start, health check, crash recovery, cleanup.

```ts
class CLIProcessManager {
  private processes = new Map<string, ManagedProcess>();

  async ensureRunning(cliId: string): Promise<void> {
    if (!this.processes.has(cliId)) {
      await this.start(cliId);
      return;
    }
    const proc = this.processes.get(cliId)!;
    if (!(await proc.isAlive())) {
      await proc.restart();
    }
  }

  private async start(cliId: string): Promise<void> {
    const proc = new ManagedProcess(cliId);
    // Start silently — no terminal window, no UI
    proc.on('crash', () => this.scheduleRestart(cliId, { backoff: true }));
    proc.on('zombie', () => proc.kill());
    await proc.launch();
    this.processes.set(cliId, proc);
  }

  async shutdownAll(): Promise<void> {
    for (const proc of this.processes.values()) {
      await proc.gracefulShutdown(5000); // 5s timeout then SIGKILL
    }
  }
}
```

| State | Handling |
|-------|----------|
| **Crash** | Auto-restart with exponential backoff (1s, 2s, 4s, max 30s) |
| **Zombie** | Detect orphaned processes via PID check, kill and restart |
| **Hang** | Health check timeout (10s) → SIGTERM → SIGKILL after 3s |
| **Stale** | Restart every 24h to clear memory leaks |

### Capability Registry

Each CLI exposes what it can do so raw-code routes tasks intelligently instead of guessing.

```ts
interface CLICapability {
  type: 'code_review' | 'file_edit' | 'git_ops' | 'code_gen'
        | 'shell_exec' | 'web_search' | 'reasoning' | 'vision';
  confidence: number; // 0-1 how well this CLI handles the task
  modelIds: string[]; // which of its models support this capability
}

class CapabilityRegistry {
  private registry = new Map<string, CLICapability[]>();

  register(cliId: string, capabilities: CLICapability[]) {
    this.registry.set(cliId, capabilities);
  }

  findBestCLI(taskType: string): { cliId: string; modelId: string } | null {
    let best: { cliId: string; modelId: string; confidence: number } | null = null;

    for (const [cliId, caps] of this.registry) {
      for (const cap of caps) {
        if (cap.type === taskType && cap.confidence > (best?.confidence ?? 0)) {
          best = { cliId, modelId: cap.modelIds[0], confidence: cap.confidence };
        }
      }
    }

    return best ? { cliId: best.cliId, modelId: best.modelId } : null;
  }
}
```

| CLI | Capabilities |
|-----|-------------|
| **opencode** | code_gen (0.9), reasoning (0.9), shell_exec (0.8), web_search (0.7), vision (0.6) |
| **codex** | code_gen (0.95), code_review (0.9), file_edit (0.85) |
| **claude** | code_gen (0.9), reasoning (0.85), file_edit (0.8), vision (0.7) |
| **aider** | file_edit (0.95), code_gen (0.8), git_ops (0.9) |
| **agy** | code_gen (0.85), reasoning (0.8), shell_exec (0.9) |

### Streaming

CLIs emit tokens, diffs, and progress incrementally — raw-code should forward these to the UI in real time instead of waiting for full responses.

```ts
interface CLIStreamEvent {
  type: 'token' | 'diff' | 'progress' | 'error' | 'done' | 'tool_call';
  data: any;
  timestamp: number;
}

abstract class StreamingBridge implements CLIBridge {
  abstract stream(command: string, args?: string[]): AsyncIterable<CLIStreamEvent>;

  async *executeStream(command: string, args?: string[]): AsyncIterable<CLIStreamEvent> {
    const stream = this.stream(command, args);

    for await (const event of stream) {
      // Forward to AI service stream
      yield event;

      if (event.type === 'tool_call') {
        // Route sub-tool calls back through raw-code's tool system
        const result = await this.handleToolCall(event.data);
        yield { type: 'tool_result', data: result, timestamp: Date.now() };
      }
    }
  }
}

// Opencode WebSocket streams tokens natively
class OpenCodeStreamingBridge extends StreamingBridge {
  async *stream(command: string, args?: string[]): AsyncIterable<CLIStreamEvent> {
    const ws = new WebSocket('ws://localhost:3080/ws/stream');
    ws.send(JSON.stringify({ type: 'execute', command, args }));

    for await (const msg of this.websocketIterator(ws)) {
      const event = JSON.parse(msg);
      yield event;
      if (event.type === 'done') break;
    }
  }

  private async *websocketIterator(ws: WebSocket): AsyncIterable<string> {
    // Yield each message from the WebSocket as it arrives
  }
}
```

### Context Transfer

When raw-code delegates to a CLI, it should pass relevant context so the CLI isn't starting from zero.

```ts
interface CLIContext {
  conversationHistory: Array<{ role: string; content: string }>;
  openFiles: Array<{ path: string; content: string }>;
  projectStructure: string;       // tree output
  gitDiff?: string;               // current unstaged changes
  environment: Record<string, string>; // relevant env vars
}

class ContextPrepper {
  async prepareContext(cliId: string, bridge: CLIBridge): Promise<CLIContext> {
    const context: CLIContext = {
      conversationHistory: this.getRecentMessages(20),
      openFiles: await this.getOpenFiles(),
      projectStructure: await this.getProjectTree(),
      environment: this.getSafeEnvVars(cliId),
    };

    // Transfer context silently — no UI prompt
    await bridge.setContext(context);
    return context;
  }
}
```

### Conflict Resolution

When two CLIs offer the same model, raw-code needs a tiebreaker.

| Conflict | Resolution |
|----------|-----------|
| Same model on two CLIs | Prefer the one with higher capability confidence for the current task |
| Same capability on two CLIs | Prefer the one connected first (or user-set priority in settings) |
| Conflicting auth tokens | Use the most recently refreshed token |
| Conflicting file edits | Apply sequentially, warn if overlapping regions |

```ts
class ConflictResolver {
  resolveModelConflict(modelId: string, candidates: CLIBridge[]): CLIBridge {
    // 1. User preference (if set in settings)
    const preferred = this.getUserPreferredCLI(modelId);
    if (preferred && candidates.find(c => c.id === preferred)) {
      return candidates.find(c => c.id === preferred)!;
    }

    // 2. First-connected wins
    return candidates[0];
  }
}
```

### Cost Tracking

Some CLI models have usage costs. Display them so users aren't surprised.

```ts
interface CostInfo {
  modelId: string;
  cliId: string;
  perRequest: number | null;     // fixed cost per request, or null if free
  perToken: { input: number; output: number } | null;
  isFree: boolean;
}

class CostTracker {
  private usageLog: Array<{ modelId: string; tokens: number; cost: number; timestamp: number }> = [];

  async getCost(modelId: string, bridge: CLIBridge): Promise<CostInfo> {
    const info = await bridge.getModelCosts(modelId);
    return {
      modelId,
      cliId: bridge.id,
      ...info,
      isFree: info.perRequest === null && info.perToken === null,
    };
  }

  showInUI(model: ModelInfo): string {
    if (model.free) return 'Free';
    return `$${model.costPerRequest?.toFixed(2) ?? '?'}/req`;
  }
}
```

```
┌─────────────────────────────────────────────┐
│  Model Selector                             │
│                                             │
│  opencode/deepseek-v4-flash-free    [Free]  │
│  opencode/mimo-v2.5-free            [Free]  │
│  codex/gpt-4o                      [$0.03]  │
└─────────────────────────────────────────────┘
```

### User Consent

Before executing destructive or expensive commands, prompt the user.

```ts
class ConsentManager {
  private consentCache = new Map<string, boolean>();

  async requireConsent(
    cliId: string,
    action: string,
    details: string
  ): Promise<boolean> {
    // Check cache (skip if user already approved this action type)
    if (this.consentCache.get(`${cliId}:${action}`)) return true;

    // Show lightweight inline prompt (not a modal)
    const granted = await this.showConsentPrompt(cliId, action, details);
    if (granted) {
      // Remember for 5 minutes
      this.consentCache.set(`${cliId}:${action}`, true);
      setTimeout(() => this.consentCache.delete(`${cliId}:${action}`), 300000);
    }
    return granted;
  }

  private async showConsentPrompt(cliId: string, action: string, details: string): Promise<boolean> {
    // Returns a promise that resolves to true/false
    // UI: small toast-like bar above chat input
    return new Promise((resolve) => {
      dispatchEvent(new CustomEvent('raw-code:consent', {
        detail: { cliId, action, details, resolve }
      }));
    });
  }
}
```

| Action | Consent Required? |
|--------|------------------|
| Read file | No |
| Edit file | Yes (first time per session) |
| Execute shell command | Yes |
| Install package | Yes |
| Delete file | Yes |
| Expensive API call (>$0.10) | Yes |

### Multi-Project

Different projects may need different CLI connections or models.

```ts
class ProjectCLIManager {
  private projectConfigs = new Map<string, {
    cliConnections: string[];     // which CLIs to connect for this project
    preferredModel: string;       // default model for this project
  }>();

  async switchToProject(projectPath: string): Promise<void> {
    // Load per-project CLI config from .raw-code/cli.json
    const config = await this.loadProjectConfig(projectPath);
    this.projectConfigs.set(projectPath, config);

    // Disconnect CLIs not needed for this project
    for (const [cliId] of this.bridges) {
      if (!config.cliConnections.includes(cliId)) {
        await this.disconnectCLI(cliId);
      }
    }

    // Connect CLIs needed for this project
    for (const cliId of config.cliConnections) {
      if (!this.isConnected(cliId)) {
        await this.connectCLI(cliId);
      }
    }

    // Update model list to reflect project config
    this.updateModelListForProject(config);
  }

  private async loadProjectConfig(projectPath: string): Promise<{
    cliConnections: string[];
    preferredModel: string;
  }> {
    try {
      const content = await readFile(path.join(projectPath, '.raw-code', 'cli.json'), 'utf-8');
      return JSON.parse(content);
    } catch {
      // Default: use all connected CLIs
      return { cliConnections: [...this.bridges.keys()], preferredModel: '' };
    }
  }
}
```

```
.raw-code/cli.json (per-project config)
{
  "cliConnections": ["opencode", "codex"],
  "preferredModel": "opencode/deepseek-v4-flash-free"
}
```

---

## Core Principles

- **No UI for CLI detection** — detection is invisible, just logs
- **No version checking** — only binary existence matters
- **Automatic on new devices** — no setup needed
- **Background only** — no terminal window opens
- **Unified model access** — all CLI models in your app's UI
- **Direct tool calling** — raw-code AI invokes CLI tools as needed

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

The result is a seamless experience where raw-code connects to available CLI agents automatically and lets the user work with all their AI tools through a single interface — just like how opencode desktop works.
