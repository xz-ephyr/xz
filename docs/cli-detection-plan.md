# CLI Detection — Detect Installed AI Coding Agents

> **Date:** 2026-06-28
> **Status:** Planning
> **Icon (Hugeicons):** `CommandLineIcon`

---

## Table of Contents

1. [Motivation](#motivation)
2. [Target CLIs](#target-clis)
3. [Detection Strategy](#detection-strategy)
4. [Architecture](#architecture)
5. [API Design](#api-design)
6. [Implementation Guide](#implementation-guide)
7. [Security & Stability](#security--stability)
8. [Platform Considerations](#platform-considerations)
9. [Testing](#testing)
10. [Future Work](#future-work)

---

## Motivation

The xz app should be aware of which AI coding CLIs the user already has installed. This enables:

- **Auto-configuration**: Suggest providers/models based on detected CLIs
- **Cross-tool workflows**: Let the AI call other CLIs as tools (e.g. "ask Codex to review this diff")
- **Unified dashboard**: Show the user which tools are available in a "Detected CLI" panel
- **Reduced friction**: Skip API key setup for providers whose CLI auth can be reused
- **Agent orchestration**: Route sub-tasks to the best-suited agent on the system

---

## Target CLIs

| CLI Name | Binary | Provider | Install Methods | Config Files |
|----------|--------|----------|-----------------|--------------|
| **OpenAI Codex CLI** | `codex` | OpenAI | npm, homebrew, curl/sh, GitHub release | `~/.codex/config.toml` |
| **Google Antigravity CLI** | `agy` | Google | curl/sh, GitHub release | `~/.gemini/antigravity-cli/settings.json` |
| **Claude Code** | `claude` | Anthropic | npm, curl/sh | `~/.claude/settings.json` |
| **OpenCode** | `opencode` | Anomaly Innovations | npm, bun, homebrew, paru | `~/.config/opencode/config.json` |
| **Google Gemini CLI** | `gemini` | Google | npm (deprecated, EOL 2026-06-18) | `~/.gemini/config.json` |
| **Aider** | `aider` | Aider AI | pip, brew | `~/.aider.conf.yml` |
| **AWS Kiro** | `kiro` | AWS | npm, brew | `~/.kiro/config.json` |
| **GitHub Copilot CLI** | `gh copilot` | GitHub | `gh extension install` | `~/.config/gh/config.yml` |

---

## Detection Strategy

### Primary Method: `which` / `where` (Tauri shell)

The most reliable cross-platform approach is to run the platform's standard PATH lookup:

- **macOS / Linux**: `which <binary>` (returns path or empty)
- **Windows**: `where <binary>` (returns path(s) or error)

Use the Tauri `shell` plugin to spawn these commands. This is already available — `shell:allow-spawn` is granted in `src-tauri/capabilities/default.json`.

```ts
// Pseudocode
async function detectCLI(binary: string): Promise<string | null> {
  const cmd = process.platform === 'win32' ? 'where' : 'which';
  try {
    const result = await spawnCommand(cmd, [binary]);
    return result.stdout.trim().split('\n')[0] || null;
  } catch {
    return null;
  }
}
```

### Fallback: Known install locations

For Tauri apps, you can also check well-known paths:

| Platform | Common Paths |
|----------|-------------|
| macOS | `/usr/local/bin`, `/opt/homebrew/bin`, `~/.npm-global/bin` |
| Linux | `/usr/local/bin`, `/usr/bin`, `~/.npm-global/bin` |
| Windows | `%APPDATA%\npm`, `%LOCALAPPDATA%\Programs\`, `%USERPROFILE%\.npm-global` |

```ts
const KNOWN_PATHS: Record<string, string[]> = {
  codex: [
    '/usr/local/bin/codex',
    '/opt/homebrew/bin/codex',
    '~/.npm-global/bin/codex',
  ],
  agy: [
    '/usr/local/bin/agy',
    '/opt/homebrew/bin/agy',
  ],
  // ...
};
```

### Web (non-Tauri) fallback

When running in a browser (dev mode), CLI detection is not possible. The service should:
- Return `null` for all CLIs
- Show a UI hint: "CLI detection only available in desktop app"
- Optionally read from localStorage if the user has manually declared their CLIs

### Version probing

After detecting the binary, run `<binary> --version` to capture the version string. This helps with:
- Displaying "Codex CLI v0.142.2" in the UI
- Feature-gating based on minimum version requirements
- Detecting auth status (some CLIs have `auth status` subcommands)

---

## Architecture

### Layer diagram

```
┌──────────────────────────────────────────────────────────┐
│                    React UI Layer                         │
│  <DetectedCliPanel />  |  <ModelSetupStep />             │
├──────────────────────────────────────────────────────────┤
│                  CLI Detection Service                    │
│  src/services/CLIDetectionService.ts                     │
│  - detectCLI(binary): Promise<CLIResult | null>          │
│  - detectAll(): Promise<CLIResult[]>                     │
│  - getCLIVersion(binary): Promise<string | null>         │
│  - getCLIConfigPath(binary): Promise<string | null>      │
├──────────────────────────────────────────────────────────┤
│                    Adapter Layer                          │
│  TauriShellAdapter  │  WebFallbackAdapter                │
├──────────────────────────────────────────────────────────┤
│                 Tauri / Platform APIs                     │
│  shell:allow-spawn  │  fs:read-file                      │
└──────────────────────────────────────────────────────────┘
```

### File structure

```
src/
├── services/
│   └── CLIDetectionService.ts       # Main detection service
├── hooks/
│   └── useCLIDetection.ts           # React hook for consuming the service
├── components/
│   ├── settings/
│   │   └── DetectedCLIPanel.tsx     # UI panel showing detected CLIs
│   └── onboarding/
│       └── CLIDetectionStep.tsx     # Onboarding step for detected CLIs
├── lib/
│   ├── cliRegistry.ts               # Registry of known CLIs and their metadata
│   └── tauri.ts                     # Existing Tauri detection utility
└── types/
    └── cli.ts                       # TypeScript types for CLI detection
```

---

## API Design

### Types (`src/types/cli.ts`)

```ts
export interface CLIDefinition {
  id: string;
  name: string;
  binary: string;
  provider: string;
  description: string;
  homepage: string;
  installMethods: string[];
  configPaths: string[];
  versionFlags: string[];
  authCheckCommand?: string;
  icon?: string;
}

export interface CLIResult {
  cli: CLIDefinition;
  detected: boolean;
  path: string | null;
  version: string | null;
  configPath: string | null;
  authStatus: 'authenticated' | 'unauthenticated' | 'unknown' | null;
  error?: string;
}

export type DetectionPlatform = 'tauri' | 'web';
```

### Service (`src/services/CLIDetectionService.ts`)

```ts
export class CLIDetectionService {
  constructor(private platform: DetectionPlatform) {}

  async detectAll(): Promise<CLIResult[]> { ... }
  async detectCLI(id: string): Promise<CLIResult | null> { ... }
  async getVersion(binary: string): Promise<string | null> { ... }
  async checkAuth(cli: CLIResult): Promise<'authenticated' | 'unauthenticated' | 'unknown'> { ... }

  // Events
  onDetectionComplete?: (results: CLIResult[]) => void;
  onError?: (cliId: string, error: Error) => void;
}
```

### Hook (`src/hooks/useCLIDetection.ts`)

```ts
interface UseCLIDetectionResult {
  results: CLIResult[];
  detectedCLIs: CLIResult[];   // filtered: only detected=true
  loading: boolean;
  error: Error | null;
  reDetect: () => Promise<void>;
  isTauri: boolean;
}

function useCLIDetection(): UseCLIDetectionResult { ... }
```

### Registry (`src/lib/cliRegistry.ts`)

```ts
export const KNOWN_CLIS: CLIDefinition[] = [
  {
    id: 'codex',
    name: 'Codex CLI',
    binary: 'codex',
    provider: 'OpenAI',
    description: 'OpenAI\'s terminal-based AI coding assistant',
    homepage: 'https://developers.openai.com/codex',
    installMethods: ['npm install -g @openai/codex', 'brew install --cask codex', 'curl -fsSL https://chatgpt.com/codex/install.sh | sh'],
    configPaths: ['~/.codex/config.toml'],
    versionFlags: ['--version'],
    authCheckCommand: 'codex auth status',
  },
  {
    id: 'antigravity',
    name: 'Antigravity CLI',
    binary: 'agy',
    provider: 'Google',
    description: 'Google\'s terminal-first AI coding agent',
    homepage: 'https://antigravity.google',
    installMethods: ['curl -fsSL https://antigravity.google/install.sh | sh'],
    configPaths: ['~/.gemini/antigravity-cli/settings.json'],
    versionFlags: ['--version'],
    authCheckCommand: 'agy auth status',
  },
  {
    id: 'claude',
    name: 'Claude Code',
    binary: 'claude',
    provider: 'Anthropic',
    description: 'Anthropic\'s AI coding agent for the terminal',
    homepage: 'https://docs.anthropic.com/en/docs/claude-code',
    installMethods: ['npm install -g @anthropic/claude-code'],
    configPaths: ['~/.claude/settings.json'],
    versionFlags: ['--version'],
  },
  {
    id: 'opencode',
    name: 'OpenCode',
    binary: 'opencode',
    provider: 'Anomaly Innovations',
    description: 'AI-native terminal coding agent with multi-provider support',
    homepage: 'https://opencode.ai',
    installMethods: ['npm install -g @opencode/opencode', 'bun install -g opencode'],
    configPaths: ['~/.config/opencode/config.json'],
    versionFlags: ['--version'],
  },
  {
    id: 'gemini',
    name: 'Gemini CLI (deprecated)',
    binary: 'gemini',
    provider: 'Google',
    description: 'Google\'s previous terminal coding agent (EOL June 18, 2026)',
    homepage: 'https://github.com/google-gemini/gemini-cli',
    installMethods: ['npm install -g @google/gemini-cli'],
    configPaths: ['~/.gemini/config.json'],
    versionFlags: ['--version'],
    deprecationNotice: 'Replaced by Antigravity CLI. Will stop serving requests after June 18, 2026.',
  },
  {
    id: 'aider',
    name: 'Aider',
    binary: 'aider',
    provider: 'Aider AI',
    description: 'AI pair programming in the terminal',
    homepage: 'https://aider.chat',
    installMethods: ['pip install aider-chat', 'brew install aider'],
    configPaths: ['~/.aider.conf.yml'],
    versionFlags: ['--version'],
  },
  {
    id: 'kiro',
    name: 'AWS Kiro',
    binary: 'kiro',
    provider: 'AWS',
    description: 'Amazon\'s AI coding agent for the terminal',
    homepage: 'https://aws.amazon.com/kiro',
    installMethods: ['npm install -g @aws/kiro', 'brew install kiro'],
    configPaths: ['~/.kiro/config.json'],
    versionFlags: ['--version'],
  },
  {
    id: 'copilot',
    name: 'GitHub Copilot CLI',
    binary: 'gh',
    provider: 'GitHub',
    description: 'GitHub Copilot in the terminal (gh extension)',
    homepage: 'https://github.com/github/gh-copilot',
    installMethods: ['gh extension install github/gh-copilot'],
    configPaths: ['~/.config/gh/config.yml'],
    versionFlags: ['copilot --version'],
    subcommand: ['copilot', '--version'],
  },
];
```

---

## Implementation Guide

### Step 1: Create the CLI registry

Create `src/lib/cliRegistry.ts` with the `KNOWN_CLIS` array (see above). This is the single source of truth for which CLIs the app knows about.

### Step 2: Create TypeScript types

Create `src/types/cli.ts` with `CLIDefinition`, `CLIResult`, and `DetectionPlatform` types.

### Step 3: Build the detection service

Create `src/services/CLIDetectionService.ts`:

```ts
import { isTauri } from '../lib/tauri';
import { KNOWN_CLIS } from '../lib/cliRegistry';
import type { CLIDefinition, CLIResult, DetectionPlatform } from '../types/cli';

function getPlatform(): DetectionPlatform {
  return isTauri() ? 'tauri' : 'web';
}

async function spawnWhich(binary: string): Promise<string | null> {
  const cmd = navigator.platform.startsWith('Win') ? 'where' : 'which';
  try {
    // In Tauri, use @tauri-apps/plugin-shell
    const { Command } = await import('@tauri-apps/plugin-shell');
    const result = await Command.create('run-cmd', [cmd, binary]).execute();
    if (result.code === 0) {
      return result.stdout.trim().split('\n')[0] || null;
    }
    return null;
  } catch {
    return null;
  }
}

// Web fallback: cannot detect CLIs
function webFallback(cli: CLIDefinition): CLIResult {
  return {
    cli,
    detected: false,
    path: null,
    version: null,
    configPath: null,
    authStatus: null,
  };
}

export class CLIDetectionService {
  private platform: DetectionPlatform;

  constructor() {
    this.platform = getPlatform();
  }

  async detectAll(): Promise<CLIResult[]> {
    const results = await Promise.all(
      KNOWN_CLIS.map(cli => this.detectCLI(cli.id))
    );
    return results.filter((r): r is CLIResult => r !== null);
  }

  async detectCLI(id: string): Promise<CLIResult | null> {
    const cli = KNOWN_CLIS.find(c => c.id === id);
    if (!cli) return null;

    if (this.platform === 'web') {
      return webFallback(cli);
    }

    const binary = cli.subcommand ? cli.binary : cli.binary;
    const path = await spawnWhich(binary);

    if (!path) {
      return {
        cli,
        detected: false,
        path: null,
        version: null,
        configPath: null,
        authStatus: null,
      };
    }

    const version = await this.getVersion(cli);
    const configPath = await this.findConfig(cli);

    return {
      cli,
      detected: true,
      path,
      version,
      configPath,
      authStatus: null, // Auth check is expensive; do on demand
    };
  }

  private async getVersion(cli: CLIDefinition): Promise<string | null> {
    try {
      const { Command } = await import('@tauri-apps/plugin-shell');
      const args = cli.subcommand
        ? [cli.subcommand[0], ...cli.subcommand.slice(1)]
        : cli.versionFlags;
      const result = await Command.create('run-cmd', [cli.binary, ...args]).execute();
      if (result.code === 0) {
        return result.stdout.trim().split('\n')[0] || null;
      }
      return null;
    } catch {
      return null;
    }
  }

  private async findConfig(cli: CLIDefinition): Promise<string | null> {
    // Check each known config path
    for (const configPath of cli.configPaths) {
      try {
        const { readTextFile } = await import('@tauri-apps/plugin-fs');
        await readTextFile(configPath.replace('~', os.homedir()));
        return configPath;
      } catch {
        continue;
      }
    }
    return null;
  }
}
```

### Step 4: Create the React hook

Create `src/hooks/useCLIDetection.ts`:

```ts
import { useState, useEffect, useCallback } from 'react';
import { CLIDetectionService } from '../services/CLIDetectionService';
import type { CLIResult } from '../types/cli';
import { isTauri } from '../lib/tauri';

export function useCLIDetection() {
  const [results, setResults] = useState<CLIResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const detect = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const service = new CLIDetectionService();
      const detected = await service.detectAll();
      setResults(detected);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    detect();
  }, [detect]);

  return {
    results,
    detectedCLIs: results.filter(r => r.detected),
    loading,
    error,
    reDetect: detect,
    isTauri: isTauri(),
  };
}
```

### Step 5: Build the UI component

Create `src/components/settings/DetectedCLIPanel.tsx` for display in Settings:

```tsx
// Shows a list of detected CLIs with:
// - Name, version, binary path
// - Config file location (clickable)
// - Auth status badge
// - Link to install if not detected
// - Action buttons: "Configure in xz", "Open CLI docs"
```

### Step 6: Integrate with onboarding

Modify `ModelSetupStep.tsx` to:
1. Run CLI detection on mount
2. Auto-fill API key fields if detected CLI has a known config that contains keys
3. Show a "Detected CLI" section with one-click provider setup

### Step 7: Store results

Store detection results in localStorage so they persist across sessions and don't require re-detection on every load:

```ts
const STORAGE_KEY = 'detected-clis';

function persistResults(results: CLIResult[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(results));
}

function loadPersistedResults(): CLIResult[] | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}
```

Add a "Re-detect CLIs" button in settings that runs detection again and updates the stored results.

---

## Security & Stability

### Risk: Arbitrary command execution

Running `which`/`where` with user-controlled binary names could be exploited if an attacker controls the binary name string. Mitigations:

- **Use a fixed allowlist**: Only run detection against `KNOWN_CLIS` — never accept arbitrary binary names from user input.
- **No argument injection**: Binary names from the registry are hardcoded strings, not user input.
- **No shell interpretation**: Use Tauri's `Command.create()` which does NOT run through a shell. This prevents argument injection entirely.

### Risk: Performance

Running N+1 subprocesses on app load could be slow:

- **Batch detection**: Use `Promise.allSettled` to run all `which` calls in parallel.
- **Cache results**: Persist to localStorage and only re-detect on explicit user action or version check.
- **Timeout**: Abort detection after 5 seconds per CLI.

```ts
async function detectWithTimeout(binary: string, ms = 5000): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  try {
    return await spawnWhich(binary);
  } finally {
    clearTimeout(timeout);
  }
}
```

### Risk: Resource consumption

On Windows, `where` can be slow if PATH is very long. Always use a timeout.

### Risk: Config file reading

Reading config files (e.g. `~/.codex/config.toml`) may contain API keys or tokens:

- **Only read config file paths**, not their contents, unless the user explicitly opts in
- If reading content for auto-fill, **never log or transmit** the values
- Show a confirmation dialog before extracting keys: "Found an API key in {config}. Use it to configure {provider}?"

### Risk: False positives

A binary named `codex` might not be OpenAI's Codex CLI. Mitigations:

- After detecting the binary, run `<binary> --version` and check if the output matches expected patterns
- Check for known config files as secondary verification
- Let the user override detection results manually

---

## Platform Considerations

### macOS

- `which` is always available at `/usr/bin/which`
- Homebrew installs to `/opt/homebrew/bin/` (Apple Silicon) or `/usr/local/bin/` (Intel)
- npm global binaries are typically at `/usr/local/bin/` or `~/.npm-global/bin/`
- Config files are in `~/.<tool-name>/`

### Linux

- `which` is available on virtually all distributions
- npm global binaries at `/usr/local/bin/` or `~/.npm-global/bin/`
- Config files follow XDG spec: `~/.config/<tool>/` or `~/.<tool-name>/`

### Windows

- Use `where` instead of `which` (built into CMD and PowerShell)
- npm global binaries at `%APPDATA%\npm\` (typically `C:\Users\<user>\AppData\Roaming\npm\`)
- Config files in `%APPDATA%\<tool>\` or `%USERPROFILE%\.<tool-name>\`
- Some AI CLIs (like Codex) recommend WSL2 on Windows; these won't be detectable from the Windows host unless the WSL path is in the Windows PATH
- **Edge case**: If running in WSL, use the Linux detection logic instead
- The Tauri shell plugin handles Windows correctly with `Command.create()`

### Tauri shell plugin configuration

The existing `src-tauri/capabilities/default.json` already includes `shell:allow-spawn`, which is sufficient. No additional Tauri plugin configuration is needed.

However, you may want to add a more specific sidecar or shell scope. Update `default.json`:

```json
{
  "permissions": [
    "core:default",
    "shell:allow-spawn",
    "shell:allow-execute",
    "shell:allow-stdin-write",
    "shell:allow-kill",
    // ... existing permissions
  ]
}
```

---

## Testing

### Unit tests

```ts
// CLIDetectionService.test.ts
describe('CLIDetectionService', () => {
  it('returns null for unknown binary', async () => { ... });
  it('returns path for known binary', async () => { ... });
  it('handles timeout gracefully', async () => { ... });
  it('caches results to localStorage', async () => { ... });
});

// cliRegistry.test.ts
describe('cliRegistry', () => {
  it('has unique IDs for all entries', () => { ... });
  it('has no duplicate binaries', () => { ... });
});
```

### Integration tests (Tauri)

- Mock the Tauri shell plugin and verify that `Command.create` is called with correct arguments
- Test that the web fallback returns `detected: false` for all CLIs

### Manual testing checklist

- [ ] macOS: `codex` installed via npm → detected
- [ ] macOS: `agy` installed via curl/sh → detected
- [ ] Linux: `claude` installed via npm → detected
- [ ] Windows: `codex` installed via npm → detected (via `where`)
- [ ] Windows: No CLIs installed → all show `detected: false`
- [ ] Web (dev mode): all show `detected: false` with hint about desktop app
- [ ] Detection results persist across page refreshes
- [ ] "Re-detect" button re-runs detection and updates results
- [ ] Timeout: detection fails fast if a binary hangs

---

## Future Work

### Phase 2: Config parsing

Parse config files from detected CLIs to auto-extract:
- API keys (with user consent)
- Model preferences
- MCP server configurations
- Permission settings

### Phase 3: Cross-CLI tool calling

Use the Model Context Protocol (MCP) to let xz's AI call detected CLIs as tools:

```
User: "Ask Codex to review this PR diff"
xz AI → MCP → codex exec "Review this diff" → returns result
```

This is already possible via tools like [multi-cli MCP](https://github.com/osanoai/multicli).

### Phase 4: Status monitoring

Watch CLI processes and show live status:
- Is the CLI currently running?
- Is there an active session?
- Background task progress

### Phase 5: Installation management

From within xz, offer to install undetected CLIs:
- "Codex CLI not detected. Install with npm? [Install]"
- Use Tauri shell to run the install command
- Show a progress indicator

---

## Appendix A: Existing Architecture Notes

The xz app already has:

- **Tauri detection**: `src/lib/tauri.ts` — checks `window.__TAURI_INTERNALS__`
- **Shell permissions**: `src-tauri/capabilities/default.json` has `shell:allow-spawn` and `shell:allow-kill`
- **File system access**: `fs:default` permission for reading config files
- **Provider config**: `src/config/models.ts` — defines providers, API keys, and model definitions
- **AI service**: `src/services/aiService.ts` — instantiates AI SDK providers from stored API keys
- **Onboarding flow**: `src/components/onboarding/` — step-by-step setup wizard
- **Settings modal**: `src/components/settings/SettingsModal.tsx` — existing settings UI

## Appendix B: CLI BIOS Detection (Stretch Goal)

For an even deeper integration, implement a "CLI BIOS" — a lightweight health check that runs on app startup:

```
┌──────────────────────────────────────────┐
│  xz CLI BIOS                              │
│──────────────────────────────────────────│
│  ✓ which   codex  → /usr/local/bin/codex  │
│  ✓ version codex  → 0.142.2               │
│  ✓ config  codex  → ~/.codex/config.toml  │
│  ✓ auth    codex  → Authenticated          │
│──────────────────────────────────────────│
│  ✓ which   agy    → /opt/homebrew/bin/agy  │
│  ✓ version agy    → 1.2.0                  │
│  ✗ auth    agy    → Not authenticated      │
│──────────────────────────────────────────│
│  ✗ which   claude → not found              │
└──────────────────────────────────────────┘
```
