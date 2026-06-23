# Plugins Tab (`/plugins`) — Ideas

> **Date:** 2026-06-23
> **Icon (Hugeicons):** `ResourcesAddIcon`
> **Currently:** 6-line placeholder stub in `src/pages/PluginsPage.tsx`

---

## Concept

A **plugin/extension marketplace** for the AI — installable capabilities that extend what the AI can do (tools, knowledge sources, custom prompts, integrations).

---

## Possible Features

| Feature | Description |
|---------|-------------|
| **Built-in plugins** | A curated list of official plugins bundled with the app: Web Search, Code Execution, Image Generation, etc. Toggle on/off per plugin. |
| **Custom plugins** | User-defined plugins written as JSON describing: name, description, system prompt additions, tool definitions, API endpoints. |
| **Plugin detail view** | Click a plugin to see: description, version, author, configuration options, enabled/disabled toggle. |
| **Plugin config** | Some plugins need API keys or endpoints. Inline config modal with fields (text, password, select, boolean). |
| **Search / filter** | All, Enabled, Disabled, Built-in, Custom. |
| **Plugin import/export** | Export a plugin as `.json`; import from file or paste JSON. |
| **Preset packs (stretch)** | Bundles of plugins for different workflows: "Research", "Coding", "Writing". |

---

## Plugin Schema (speculative)

```ts
interface PluginDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  type: 'builtin' | 'custom';
  icon?: string;
  enabled: boolean;
  config?: Record<string, PluginConfigField>;
  systemPromptAdditions?: string;
  tools?: ToolDefinition[];
  createdAt: number;
  updatedAt: number;
}

interface PluginConfigField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'select' | 'boolean';
  required: boolean;
  defaultValue?: any;
  options?: { label: string; value: string }[];
}
```

---

## Built-in Plugin Ideas

| Plugin | Description | Tools/Features |
|--------|-------------|----------------|
| **Web Search** | Let the AI search the web for current info | `web_search` tool |
| **Code Runner** | Execute JavaScript/Python in a sandbox | `run_code` tool |
| **Image Gen** | Generate images via API (DALL·E, Stable Diffusion) | `generate_image` tool |
| **Vector Memory** | Long-term memory via embeddings | Auto RAG on chat history |
| **Git Integration** | Read commits, diff, PRs from a git repo | `git_log`, `git_diff` tools |
| **Jira / Linear** | Fetch issues, update tickets | `jira_search`, `jira_update` tools |
| **Slack / Discord** | Send messages to channels | `slack_send` tool |
| **Calculator** | Precise math evaluation | `calculate` tool |
| **PDF Reader** | Extract text from uploaded PDFs | `read_pdf` tool |

---

## UI Mock Layout

```
┌──────────────────────────────────────────────┐
│  Plugins                                     │
│                                                     │
│  ┌──────────────────────────────────────┐ │
│  │ 🔍 Search plugins...   [All][En.]  │ │
│  └──────────────────────────────────────┘ │
│                                                     │
│  ┌─ Enabled (3) ─────────────────────────┐ │
│  │  🔍 Web Search       v1.0    ● On     │ │
│  │  Let AI search the web                │ │
│  │                               ⚙️ 🗑️    │ │
│  │  🖼️ Image Generation   v1.2    ● On   │ │
│  │  Generate images from prompts          │ │
│  │                               ⚙️ 🗑️    │ │
│  │  📐 Calculator         v1.0    ● On   │ │
│  │  Precise math evaluation              │ │
│  │                               ⚙️ 🗑️    │ │
│  └──────────────────────────────────────┘ │
│                                                     │
│  ┌─ Disabled (2) ───────────────────────┐ │
│  │  📄 PDF Reader        v0.5    ○ Off   │ │
│  │  Extract text from PDFs              │ │
│  │                               ⚙️ 🗑️    │ │
│  │  🧠 Vector Memory     v0.8    ○ Off   │ │
│  │  Long-term AI memory                 │ │
│  │                               ⚙️ 🗑️    │ │
│  └──────────────────────────────────────┘ │
│                                                     │
│  [+ Import Plugin]  [+ Create Custom]                │
└──────────────────────────────────────────────┘
```

---

## Implementation Priority

1. Plugin list with enable/disable toggle
2. Built-in plugin definitions hardcoded in a registry file
3. Plugin detail/config modal
4. Custom plugin creation UI (JSON editor)
5. Plugin import/export
6. Wiring enabled plugins into system prompt + tool definitions (`config.ts` / `contextController.ts`)
7. Preset packs (stretch)

---

## What's Needed

| Area | Details |
|------|---------|
| **New DB tables** | `plugins` in `DatabaseService` (IndexedDB) |
| **New services** | `PluginRegistry` (load/enable/disable), `PluginContext` (injects tools/prompts into AI) |
| **UI components** | `PluginList`, `PluginDetail` (modal), `PluginConfigForm`, `PluginEditor` |
| **Existing code to reuse** | HugeiconRenderer, Toast, confirmAsync, thin-scrollbar, search bar + filter patterns from ChatsPage, settings modal pattern from SettingsModal |
