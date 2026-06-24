# Artifact Feature — Grounded Research Document

> Based on extensive research of Anthropic's Claude Artifacts (launched June 2024, continuously updated through June 2026), open-source implementations, and architectural analyses. This document synthesizes everything needed to implement a similar feature in the XZ app.

---

## Table of Contents

1. [What Are Artifacts](#1-what-are-artifacts)
2. [Core Architecture & Algorithm](#2-core-architecture--algorithm)
3. [System Prompt Design (The Brains)](#3-system-prompt-design-the-brains)
4. [Artifact Types & MIME System](#4-artifact-types--mime-system)
5. [Sandbox Architecture & Security](#5-sandbox-architecture--security)
6. [Color Design & Visual System](#6-color-design--visual-system)
7. [UI Flexibility & Layout Design](#7-ui-flexibility--layout-design)
8. [React Component Rendering Pipeline](#8-react-component-rendering-pipeline)
9. [Storage, Persistence & API Access](#9-storage-persistence--api-access)
10. [Implementation Roadmap for XZ](#10-implementation-roadmap-for-xz)
11. [Key References & Open-Source Projects](#11-key-references--open-source-projects)

---

## 1. What Are Artifacts

### Definition

Artifacts are self-contained, interactive pieces of content (code, HTML pages, React components, SVG graphics, Mermaid diagrams, documents) rendered in a dedicated side panel next to the chat conversation. Instead of outputs being buried in scrollable chat history, they get their own live, interactive workspace.

### Key Differentiator

> "Most things you ask an AI to 'write' — a landing page, a dashboard, a one-pager, a flowchart — are not really chat messages. They're documents or apps. Artifacts give those outputs their own surface."

### Core Value Propositions

| Proposition | Description |
|---|---|
| Dedicated Surface | Outputs live outside the chat stream — pinable, scrollable, referenceable |
| Live Preview | HTML/React/SVG/Mermaid renders instantly in the panel |
| In-Place Iteration | "Make the buttons bigger" — Claude rewrites in-place, preview updates live |
| Version History | Every iteration is tracked; rollback is one click |
| Shareable | Published to a private URL; shareable with anyone via link |
| Persistent Storage (2025+) | 20MB key-value storage per artifact for stateful apps |
| AI-Powered (2025+) | `window.claude.complete` API allows artifacts to call Claude themselves |
| Live Data (2026+) | MCP-connected artifacts that refresh with real-time data |

---

## 2. Core Architecture & Algorithm

### High-Level Flow

```
User Prompt
    │
    ▼
┌─────────────────────────────────────┐
│  SYSTEM PROMPT EVALUATION           │
│  ┌──────────────────────────────┐   │
│  │ <antThinking>                │   │
│  │ Is this artifact-worthy?     │   │
│  │ • >15 lines?                 │   │
│  │ • Self-contained & complex?  │   │
│  │ • User will modify/reuse?    │   │
│  │ • Valuable outside chat?     │   │
│  │ New or update existing?      │   │
│  │ </antThinking>               │   │
│  └──────────────────────────────┘   │
└──────────┬──────────────────────────┘
           │ (if yes)
           ▼
┌─────────────────────────────────────┐
│  LLM GENERATES CONTENT              │
│  Wraps in <antArtifact> tags:       │
│  <antArtifact                       │
│    identifier="kebab-case-id"       │
│    type="application/vnd.ant.xxx"   │
│    title="Human Readable Title"     │
│    language="python" (if code)      │
│  >                                  │
│    ...content...                    │
│  </antArtifact>                     │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  CLIENT-SIDE DETECTION              │
│  Parse response for antArtifact tags│
│  Extract: type, identifier, title,  │
│  language, content                  │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  ROUTING BY TYPE                    │
│  ┌──────────┐ ┌──────────┐         │
│  │ text/html │ │ image/   │         │
│  │ Render in │ │ svg+xml  │         │
│  │ iframe    │ │ Render   │         │
│  │ sandbox   │ │ inline   │         │
│  ├──────────┤ ├──────────┤         │
│  │ vnd.ant. │ │ vnd.ant. │         │
│  │ react    │ │ mermaid  │         │
│  │ Compile &│ │ Render   │         │
│  │ render   │ │ diagram  │         │
│  ├──────────┤ ├──────────┤         │
│  │ vnd.ant. │ │ text/    │         │
│  │ code     │ │ markdown │         │
│  │ Highlight│ │ Render   │         │
│  │ in editor│ │ as doc   │         │
│  └──────────┘ └──────────┘         │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  PANEL DISPLAY + INTERACTION        │
│  • Side panel next to chat          │
│  • Preview/Code/Split tabs          │
│  • Version history sidebar          │
│  • Edit, copy, download, publish    │
└─────────────────────────────────────┘
```

### Artifact-Worthiness Decision Algorithm

```
Criteria                             Weight
─────────────────────────────────────────────
Content length > 15 lines             High
Self-contained (no external deps)     High
User will iterate/modify             High
Valuable outside chat context        Medium
Interactive (forms, buttons, UI)      High
Visual (diagrams, charts, graphics)   High
Simple informational answer           REJECT
One-off question                      REJECT
Code snippet <15 lines (inline ok)    REJECT
```

### LLM Detection Strategy

The LLM is instructed to **think silently** before invoking an artifact using `<antThinking>` tags (hidden from user). It evaluates:
1. Would this content work fine without an artifact?
2. Is this a new artifact or an update to an existing one?
3. What type best fits this content?

### Versioning & Update Algorithm

- Each artifact gets a unique `identifier` (kebab-case) at creation
- When the user asks for changes, the LLM reuses the same `identifier`
- The frontend detects same-identifier artifacts and updates the existing panel in-place
- Version history is maintained per-identifier for rollback

---

## 3. System Prompt Design (The Brains)

### XML Tag Structure

```
<artifacts_info>
  <artifact_instructions>
    [Step-by-step instructions for the LLM]
  </artifact_instructions>

  [Examples of good/bad artifacts]

  <usage_notes>
    [When to use, when not to use]
  </usage_notes>
</artifacts_info>
```

### Core System Prompt Sections (Anthropic's Leaked Prompt)

| Section | Purpose |
|---|---|
| `<artifacts_info>` | Main container for artifact instructions |
| `<artifact_instructions>` | Step-by-step: think → wrap → assign ID → add type |
| `<usage_notes>` | When to prefer inline vs. artifact |
| Examples | Positive/negative examples of artifact usage |
| `<claude_info>` | General capabilities & behavior |
| `<claude_image_specific_info>` | Image handling behavior |
| `<claude_3_family_info>` | Model version info |

### Key Prompt Instructions for the LLM

```
1. Before invoking an artifact, think silently in <antThinking> tags:
   - Is this artifact-worthy? Consider length, complexity, standalone value,
     iterability
   - Is this new or an update? Reuse identifier for updates

2. Wrap content in <antArtifact> tags with attributes:
   - identifier: kebab-case, descriptive, persistent across updates
   - type: MIME type for the content category
   - title: human-readable description
   - language: (for code type) programming language

3. Rules for each artifact type (see Section 4)

4. Usage notes:
   - One artifact per message unless requested
   - Prefer inline when possible — unnecessary artifacts are jarring
   - Err on the side of NOT creating an artifact when unsure
   - Don't explain capabilities — just generate the code
```

### Example LLM Output

```xml
<antThinking>
This is a significant React component (>50 lines) with state management and interactivity. The user will likely iterate on styling and functionality. Creating an artifact is appropriate.
</antThinking>

<antArtifact
  identifier="interactive-dashboard"
  type="application/vnd.ant.react"
  title="Interactive Analytics Dashboard"
>
import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis } from "recharts";

export default function Dashboard() {
  const [data, setData] = useState([
    { name: "Jan", value: 400 },
    { name: "Feb", value: 300 },
  ]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <BarChart width={400} height={300} data={data}>
        <XAxis dataKey="name" />
        <YAxis />
        <Bar dataKey="value" fill="#cc785c" />
      </BarChart>
    </div>
  );
}
</antArtifact>
```

---

## 4. Artifact Types & MIME System

### Complete Type Registry

| Type | MIME Value | Render Behavior | Attributes |
|---|---|---|---|
| **Code** | `application/vnd.ant.code` | Syntax-highlighted code viewer (CodeMirror) | `language="python\|js\|ts\|..."` |
| **HTML** | `text/html` | Rendered in sandboxed iframe as live webpage | — |
| **SVG** | `image/svg+xml` | Rendered as scalable vector graphic | Use `viewBox`, not w/h |
| **Mermaid** | `application/vnd.ant.mermaid` | Rendered as flowchart/diagram | — |
| **React** | `application/vnd.ant.react` | Compiled & rendered in iframe with React | Must have default export |
| **Document** | `text/markdown` | Rendered as formatted markdown doc | — |

### Type-Specific Rules

#### Code (`application/vnd.ant.code`)
- Include `language` attribute
- Do NOT use triple backticks (already inside artifact tags)
- For code sharing, snippets, examples

#### HTML (`text/html`)
- Single file: HTML + CSS + JS all in one
- No external images — use `/api/placeholder/width/height`
- Only CDN allowed: `https://cdnjs.cloudflare.com`
- Prefer simple text responses for code snippets (use `vnd.ant.code` instead)
- Fall back to `vnd.ant.code` if HTML constraints can't be met
- **NEVER use localStorage/sessionStorage** — use JS variables

#### React (`application/vnd.ant.react`)
- Default export required, no required props
- Tailwind CSS for styling (NO arbitrary values like `h-[600px]`)
- Available libraries:
  - `react` (useState, useReducer, useEffect, etc.)
  - `lucide-react@0.263.1`
  - `recharts`
  - `shadcn/ui` (via `@/components/ui/...`)
- NO other libraries (zod, hookform, etc. not installed)
- No external images — use `/api/placeholder/width/height`

#### SVG (`image/svg+xml`)
- Use `viewBox` attribute, NO explicit width/height
- Render as inline SVG

#### Mermaid (`application/vnd.ant.mermaid`)
- NOT inside a code block — raw Mermaid syntax
- Types: flowchart, sequence diagram, gantt, ER, class

#### Markdown (`text/markdown`)
- Plain text or formatted markdown documents

### Custom MIME Handling Architecture

The MIME types use Anthropic's custom prefix (`application/vnd.ant.xxx`), not standard MIME types. This allows the frontend to:

1. Route to the correct renderer
2. Apply type-specific CSP/sandbox rules
3. Show appropriate UI controls (edit, copy, download)

---

## 5. Sandbox Architecture & Security

### The Double-Iframe Pattern

This is the most critical security mechanism.

```
┌─────────────────────────────────────────┐
│           HOST APPLICATION              │
│  (Main origin: app.example.com)         │
│                                          │
│  ┌───────────────────────────────────┐   │
│  │ OUTER IFRAME                      │   │
│  │ (Separate origin: *.sandbox.com)  │   │
│  │ Has real origin → can use storage │   │
│  │                                    │   │
│  │  ┌─────────────────────────────┐  │   │
│  │  │ INNER IFRAME                │  │   │
│  │  │ (srcdoc, no origin access)  │  │   │
│  │  │ Content-Security-Policy     │  │   │
│  │  │ Sandbox attributes:         │  │   │
│  │  │ • allow-scripts             │  │   │
│  │  │ • allow-same-origin         │  │   │
│  │  │ • NO allow-popups           │  │   │
│  │  │ • NO allow-top-navigation   │  │   │
│  │  │ • NO allow-forms            │  │   │
│  │  └─────────────────────────────┘  │   │
│  └───────────────────────────────────┘   │
│                                          │
│  Communication via window.postMessage    │
│  (JSON-RPC protocol)                     │
└─────────────────────────────────────────┘
```

### Security Layers

| Layer | What It Protects Against |
|---|---|
| Cross-origin iframe | Malicious artifact can't access host DOM, cookies, or localStorage |
| Dual iframe nesting | Inner iframe inherits outer's origin but has stricter sandbox |
| Content-Security-Policy | Blocks external network requests, inline scripts, eval |
| Sandbox attributes | Prevents popups, navigation, form submission |
| No localStorage in artifacts | Prevents data persistence exploitation |
| CSP restrictive CDN whitelist | Only specific CDNs for scripts/styles |
| postMessage validation | Origin checking on all messages |
| Size limit (16 MiB) | Prevents memory exhaustion |

### CSP for Artifact Iframes

```
default-src 'none';
script-src  'unsafe-inline' 'unsafe-eval'
            https://cdnjs.cloudflare.com
            https://cdn.jsdelivr.net/pyodide/;
connect-src 'self' https://api.anthropic.com;
style-src   'unsafe-inline'
            https://cdnjs.cloudflare.com
            https://fonts.googleapis.com;
img-src     data: blob:;
font-src    data:;
object-src  'none';
base-uri    'none';
form-action 'none';
frame-ancestors https://app.example.com;
```

### Key Security Constraints

| Constraint | Rationale |
|---|---|
| No external fetch/XHR | Prevents data exfiltration to attacker servers |
| No localStorage/sessionStorage | Prevents cross-session tracking/storage attacks |
| No popups | Prevents phishing via fake login windows |
| No top-navigation | Prevents redirecting host page |
| No forms | Prevents credential harvesting |
| CDN whitelist only | Prevents loading arbitrary scripts |
| Inline all assets | Ensures self-contained, no external dependencies |

### Communication Protocol (Host ↔ Artifact)

```
Artifact (inner iframe)          Host (parent window)
         │                               │
         │   postMessage({               │
         │     type: "INIT_COMPLETE",     │
         │     origin: "sandbox"          │
         │   })                           │
         │──────────────────────────────>│
         │                               │
         │   postMessage({               │
         │     type: "RESIZE",            │
         │     height: 600               │
         │   })                           │
         │──────────────────────────────>│
         │                               │
         │ <postMessage({                 │
         │   type: "UPDATE_COMPONENT",    │
         │   code: "..."                  │
         │ })                             │
         │<──────────────────────────────│
```

---

## 6. Color Design & Visual System

### Claude's Design Philosophy

> "Warm cream canvas paired with dark navy product surfaces, joined by a single coral accent. No cool grays. No pure white."

The core tension: warm humanist editorial vs. technical precision.

### Full Color Token System

#### Brand & Accent

| Token | Hex | Usage |
|---|---|---|
| Primary (coral) | `#cc785c` | CTAs, primary actions, full-bleed callout cards |
| Primary Active | `#a9583e` | Hover/active state for primary |
| Primary Disabled | `#e6dfd8` | Disabled primary elements |
| Accent Teal | `#5db8a6` | Secondary accent, alternative CTAs |
| Accent Amber | `#e8a55a` | Warning/notification accent |
| Brand Orange | `#c96442` | Brand mark, signature accent |

#### Backgrounds / Surfaces

| Token | Hex | Usage |
|---|---|---|
| Canvas | `#faf9f5` | Main page background (cream) |
| Surface Soft | `#f5f0e8` | Soft containers, hover states |
| Surface Card | `#efe9de` | Cards, elevated containers |
| Surface Strong | `#e8e0d2` | Strong emphasis backgrounds |
| Surface Dark | `#181715` | Dark theme page bg, code windows |
| Surface Dark Elevated | `#252320` | Dark theme cards, elevated elements |
| Surface Dark Soft | `#1f1e1b` | Dark theme soft surfaces |

#### Text

| Token | Hex | Usage |
|---|---|---|
| Ink | `#141413` | Primary text, headings (warm near-black) |
| Body | `#3d3d3a` | Body text |
| Body Strong | `#252523` | Emphasized body text |
| Muted | `#6c6a64` | Secondary text, captions |
| Muted Soft | `#8e8b82` | Placeholder, disabled text |
| On Primary | `#ffffff` | Text on primary (coral) bg |
| On Dark | `#faf9f5` | Text on dark surfaces |
| On Dark Soft | `#a09d96` | Secondary text on dark |

#### Borders & Structural

| Token | Hex | Usage |
|---|---|---|
| Hairline | `#e6dfd8` | Dividers, borders, outlines |
| Hairline Soft | `#ebe6df` | Subtle dividers |
| Border Dark | `#30302e` | Borders on dark surfaces |

#### Semantic Colors

| Token | Hex | Usage |
|---|---|---|
| Success | `#5db872` | Success states, confirmations |
| Warning | `#d4a017` | Warnings, caution banners |
| Error | `#c64545` | Errors, destructive actions |

### Dark Mode Strategy

- Dark mode inverts the relationship: dark navy surfaces become the canvas, cream becomes accent
- Code windows and technical panels use dark surfaces even in light mode (creates visual "mode switch")
- Coral accents remain the same — brand consistency across themes

### Color Application Principles

1. **Coral is for CTAs only** — never as a third accent or decorative element
2. **Cream canvas is the brand** — it's the defining counter-positioning against cool-gray AI brands
3. **Near-black slate for text** — not pure black (`#000`), but warm near-black (`#141413`)
4. **White (`#ffffff`) is reserved** — only for button surfaces and maximum-contrast elements
5. **Chromatic budget is tiny** — color is used for meaning, not decoration
6. **Semantic colors are muted** — success/warning/error are desaturated, not neon

---

## 7. UI Flexibility & Layout Design

### Panel Layout Architecture

```
┌──────────────────────────────────────────────────┐
│  MAIN CHAT VIEW           │  ARTIFACT PANEL       │
│                           │  (resizable)           │
│  ┌─────────────────────┐  │  ┌──────────────────┐  │
│  │ Chat Messages       │  │  │ Header           │  │
│  │ [User] Build me a   │  │  │ ┌──────────────┐ │  │
│  │       dashboard...  │  │  │ │ Title  ⋮ Share│ │  │
│  │                     │  │  │ └──────────────┘ │  │
│  │ [AI] Here's a       │  │  │ Tabs: Preview    │  │
│  │       dashboard     │  │  │       Code       │  │
│  │       <artifact>    │  │  │       Split      │  │
│  │                     │  │  │       History    │  │
│  │                     │  │  ├──────────────────┤  │
│  │ [User] Make buttons │  │  │                  │  │
│  │       bigger        │  │  │   LIVE PREVIEW   │  │
│  │                     │  │  │   (sandboxed     │  │
│  │ [AI] <updates       │  │  │    iframe)       │  │
│  │       artifact>     │  │  │                  │  │
│  └─────────────────────┘  │  │                  │  │
│                           │  │                  │  │
│  [Chat Input...          ]│  └──────────────────┘  │
└──────────────────────────────────────────────────┘
```

### Key UI Components

#### 1. Panel Header
- Artifact title (editable)
- Identifier badge
- Type icon (code/SVG/React/Mermaid)
- Version indicator
- Actions: Copy, Download, Publish, Share, Delete
- Close panel button

#### 2. Tab Bar
- **Preview** — rendered output (HTML, React, SVG, Mermaid, Markdown)
- **Code** — syntax-highlighted source (CodeMirror-backed)
- **Split** — side-by-side preview + code
- **History** — version timeline with rollback

#### 3. Preview Area
- For HTML/React: sandboxed iframe
- For SVG: inline SVG element
- For Mermaid: rendered diagram (mermaid.js)
- For Markdown: rendered markdown document
- For Code: full-screen code viewer (when no preview available)
- **Loading state**: skeleton while compiling/rendering
- **Error state**: error card with "Fix with Claude" button
- **Empty state**: "This artifact has no preview" message

#### 4. Version History Panel
- Timestamped list of versions
- Side-by-side diff view
- One-click rollback
- "Current" badge on active version

#### 5. Responsive Behavior

| Breakpoint | Layout |
|---|---|
| >1200px | Side-by-side: chat (40%) + panel (60%) |
| 768–1200px | Chat (50%) + panel (50%) with collapsible panel |
| <768px | Single column: artifact panel toggles as overlay/modal |
| Tauri desktop | Resizable split pane with min-width constraints |

### Interaction Patterns

| User Action | System Response |
|---|---|
| Request artifact | Open panel, show loading, render artifact |
| "Change X" | Stream updated artifact to existing panel |
| Click "Code" tab | Show source code in CodeMirror editor |
| Click version | Load artifact version, highlight diff |
| Press "Fix with Claude" | Pre-fill chat input with error context |
| Drag resize handle | Adjust split ratio, persist preference |
| Close panel | Collapse to original chat-only view |

### Animation & Transition Guidelines

- Panel slides in from right (300ms ease-out)
- Tabs slide content (200ms ease)
- Version switching crossfades (150ms)
- Streamed content updates smoothly (CSS transition on opacity)
- Toast notifications for copy/save/publish (auto-dismiss 3s)

---

## 8. React Component Rendering Pipeline

### The Rendering Challenge

React artifact code from the LLM is a **string** — it needs to be compiled, transpiled, and rendered inside the sandbox at runtime. This is the hardest technical challenge.

### Rendering Pipeline Steps

```
LLM returns React code string
         │
         ▼
┌─────────────────────────────────────┐
│  1. NORMALIZE                       │
│  • Extract default export           │
│  • Add React import if missing      │
│  • Fix common LLM errors            │
│  • Wrap in evaluation harness       │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  2. TRANSPILE (on-the-fly)          │
│  Options:                           │
│  a) Sucrase (fast, lightweight)     │
│     → transforms TSX/JSX → JS       │
│     → converts ESM imports →        │
│       require() shims               │
│  b) Babel (full-featured, slower)   │
│  c) esbuild (fast, good compat)     │
│                                     │
│  Transforms:                        │
│  • JSX → createElement calls        │
│  • TypeScript → JavaScript          │
│  • ESM imports → UMD globals        │
│  • Arrow functions → function decl  │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  3. BUILD SRCDOC HTML               │
│  • Inline transpiled JS             │
│  • Load React + ReactDOM UMD CDNs   │
│  • Load Tailwind CDN (play CDN)     │
│  • Load lucide-react, recharts etc. │
│  • Mount component to #root         │
│  • Inject error boundary            │
│  • Apply CSP meta tags              │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  4. RENDER IN IFRAME                │
│  • Create outer iframe (sandbox     │
│    origin)                          │
│  • Set srcdoc to built HTML         │
│  • Listen for postMessage events    │
│  • Handle resize, errors, clicks    │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  5. ERROR HANDLING                  │
│  • Try/catch around eval            │
│  • Catch rendering errors           │
│  • Show friendly error card         │
│  • "Fix with Claude" button         │
│  • Log error for debugging          │
└─────────────────────────────────────┘
```

### Transpilation Strategy Comparison

| Approach | Speed | Feature Support | Bundle Size | Notes |
|---|---|---|---|---|
| **Sucrase** | Fastest | JSX + TS (no type-check) | Tiny | Best for runtime, used by FrameForge |
| **Babel standalone** | Slow | Full ES spec + polyfills | Large | Too heavy for runtime |
| **esbuild WASM** | Fast | Modern JS + TS + JSX | Medium | Good alternative to Sucrase |
| **Sandpack** | Moderate | Full Vite-like env | Large | CodeSandbox's solution, already in XZ deps! |
| **Manual eval** | Fastest | Limited | None | Unsafe, not recommended |

### UMD Shim Strategy for Dependencies

Since the artifact runs in an iframe without module loading, dependencies must be loaded as UMD globals:

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js"></script>
<script src="https://cdn.tailwindcss.com"></script>
<script>
  // Require shim: converts import statements to UMD globals
  const modules = {
    "react": React,
    "react-dom": ReactDOM,
    "lucide-react": LucideReact,
    "recharts": Recharts,
  };
  window.require = (name) => modules[name];
  window.exports = {};
  window.module = { exports };
</script>
```

### Available Libraries in the Rendering Sandbox

| Library | Version | Import Path |
|---|---|---|
| React | 18.x | `react` |
| ReactDOM | 18.x | `react-dom` |
| Tailwind CSS | 3.x | Via CDN play script |
| lucide-react | 0.263.1 | `lucide-react` |
| recharts | 2.x | `recharts` |
| shadcn/ui | latest | `@/components/ui/...` |

### Error Boundary Component

```tsx
// Injected around every artifact
class ArtifactErrorBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="error-card">
          <p>Something went wrong rendering this component.</p>
          <button onClick={() => window.parent.postMessage({
            type: "FIX_WITH_CLAUDE",
            error: this.state.error.message
          }, "*")}>
            Fix with Claude
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

---

## 9. Storage, Persistence & API Access

### Persistent Storage API (2025+)

A key-value storage API that works on published artifacts:

```js
// Personal storage (default) — private per-user
await window.storage.setItem("key", "value", { shared: false });
const value = await window.storage.getItem("key");

// Shared storage — all users see same data
await window.storage.setItem("key", "value", { shared: true });
```

| Feature | Detail |
|---|---|
| Capacity | 20 MB per artifact |
| Scope | Per-artifact, per-user (or shared) |
| Availability | Published artifacts only (paid plans) |
| Data types | Strings (JSON-serializable) |

### AI-Powered Artifacts API (2025+)

Artifacts can call Claude directly:

```js
const response = await window.claude.complete({
  prompt: "Analyze this data...",
  system: "You are a data analyst.",
  max_tokens: 1000,
});
```

This transforms artifacts from static previews into intelligent micro-applications.

### MCP Integration (2026+)

Live Artifacts can connect to:
- Google Calendar, Gmail, Slack via MCP
- Real-time data sources
- External APIs via MCP servers

### Current Constraints (for initial implementation)

| Constraint | Current | Future |
|---|---|---|
| External APIs | Blocked by CSP | MCP bridge |
| Persistent storage | Not available | window.storage API |
| Backend logic | Static only | MCP-connected |
| Multi-file | Single file | Multi-file projects |

---

## 10. Implementation Roadmap for XZ

### Phase 1: Foundation (Weeks 1-2)

```
- [ ] Create <antArtifact> detection system in the chat response parser
- [ ] Build the artifact panel component (resizable sidebar)
- [ ] Implement basic type routing (code, markdown, mermaid)
- [ ] Add syntax highlighting for code artifacts (CodeMirror — already in deps)
- [ ] Wire up the system prompt to the AI provider
```

### Phase 2: Sandboxed Rendering (Weeks 3-4)

```
- [ ] Build the double-iframe sandbox architecture
- [ ] Implement React component transpilation pipeline (Sucrase + UMD shim)
- [ ] Implement HTML preview rendering (srcdoc iframe with CSP)
- [ ] Implement SVG rendering
- [ ] Implement Mermaid diagram rendering
- [ ] Add error boundaries and error UI
- [ ] Configure Content-Security-Policy headers
```

### Phase 3: Interaction & Polish (Weeks 5-6)

```
- [ ] Preview/Code/Split/History tabs
- [ ] In-place artifact updates (same-identifier replacement)
- [ ] Version history with rollback
- [ ] Resizable split pane with persistence
- [ ] Dark mode support
- [ ] Responsive layout (mobile overlay)
- [ ] Copy, download, share actions
- [ ] "Fix with Claude" error handling
```

### Phase 4: Advanced Features (Weeks 7-8)

```
- [ ] Persistent storage for artifacts (local-first, sync later)
- [ ] AI-powered artifacts (window.claude.complete bridge)
- [ ] Publish/share artifacts via URL
- [ ] MCP integration for live data
- [ ] Multi-file project support
- [ ] Artifact gallery/browser
```

### Tech Stack Advantages for XZ

XZ already has most dependencies in place:

| Need | XZ Already Has |
|---|---|
| Code editing | `@uiw/react-codemirror` + all language parsers |
| Sandbox execution | `@codesandbox/sandpack-react` |
| Charting | `recharts` |
| Icons | `@hugeicons/react` (can supplement with lucide) |
| AI providers | `@ai-sdk/openai`, `@ai-sdk/google`, `@ai-sdk/cerebras`, etc. |
| UI components | `shadcn/ui` via `radix-ui` |
| Styling | `tailwindcss` + `tailwindcss-animate` |
| Type checking | Full TypeScript toolchain |

---

## 11. Key References & Open-Source Projects

### Official Sources

| Resource | URL |
|---|---|
| Claude Artifacts Help Center | https://support.claude.com/en/articles/9487310-what-are-artifacts-and-how-do-i-use-them |
| Claude Blog: Artifacts GA | https://claude.com/blog/artifacts |
| Claude Blog: AI-Powered Apps | https://claude.com/blog/build-artifacts |
| Claude Design (Labs) | https://www.anthropic.com/news/claude-design-anthropic-labs |
| Claude Design System (shadcn) | https://www.shadcn.io/design/claude |
| Claude Code Artifacts Docs | https://code.claude.com/docs/en/artifacts |

### Open-Source Implementations (Study These)

| Project | Repository | Tech Stack | Relevance |
|---|---|---|---|
| **Open Artifacts Renderer** | https://github.com/13point5/open-artifacts-renderer | Next.js, iframe postMessage | Direct artifact viewer implementation |
| **Claude Artifact Runner** | https://github.com/claudio-silva/claude-artifact-runner | React + Vite + Tailwind + Shadcn | Runs artifacts locally, full project setup |
| **FrameForge** | https://github.com/Frnn4268/frame-forge-frontend | React + TypeScript + Sucrase + Twind | Best reference for transpilation pipeline |
| **Generative UI (Open Source)** | https://github.com/Anilturaga/Generative-UI | React Flow, iframe srcdoc | Multi-window canvas with LLM agent |
| **Artifactuse SDK** | https://github.com/artifactuse/sdk | React/Vue/Svelte, panel viewer | Framework-agnostic artifact panel |
| **Open Generative UI (CopilotKit)** | https://medium.com/coding-nexus/claude-artefacts-is-now-open-source | React, sandboxed iframe | Token-by-token streaming into iframe |
| **Montage SDK** | https://github.com/usemontage/sdk | React, HTML block rendering | API-driven artifact generation |
| **CoWork Artifacts** | https://github.com/CoWork-OS/CoWork-OS | Electron + React | Desktop artifact viewer |

### Leaked System Prompts (Study These)

| Resource | URL |
|---|---|
| Original Artifacts System Prompt | https://github.com/jujumilk3/leaked-system-prompts/blob/main/claude-artifacts_20240620.md |
| Updated Prompt (Nov 2024) | https://github.com/schroneko/systemprompts/blob/main/claude_sonnet_35_with_artifacts_with_analysis_with_visual_pdfs_2024-11-02.md |
| Full Prompt with Analysis | https://zerotwo.ai/prompts/system-prompts/anthropic/claude-artifacts |

### Design System References

| Resource | URL |
|---|---|
| Claude Design Tokens (shadcn) | https://www.shadcn.io/design/claude |
| Claude Visual Style Guide | https://github.com/jcmrs/claude-visual-style-guide |
| Claude Design Tokens (Open Design) | https://open-design.ai/plugins/design-system-claude/ |
| Claude Design Tokens (duply) | https://duply.ai/claude/design-md |
| Claude Design Skill (TypeUI) | https://www.typeui.sh/design-skills/claude |

### Security References

| Resource | URL |
|---|---|
| MCP App CSP Explained | https://pragmalabs.tech/blog/mcp-app-csp-explained |
| Double Iframe Security Deep-Dive | https://shaam.blog/articles/mcp-chatgpt-apps-double-iframe-security |
| Claude Sandbox CSP Reference | https://github.com/simonw/scrape-claude-artifacts |

### Articles & Deep Dives

| Resource | URL |
|---|---|
| How Anthropic Built Artifacts | https://newsletter.pragmaticengineer.com/p/how-anthropic-built-artifacts |
| The Complete 2026 Guide | https://instapods.com/blog/what-are-claude-artifacts/ |
| Claude Artifacts: What They Are (2026) | https://albato.com/blog/publications/how-to-use-claude-artifacts-guide |
| Forensic Analysis of System Prompt | https://dev.to/ejb503/a-forensic-analysis-of-the-claude-sonnet-35-system-prompt-leak-58h7 |
| Claude UI Design Challenge | https://www.kunalganglani.com/blog/claude-artifacts-ui-design-challenge |
| Claude Artifacts Limitations (2026) | https://p0stman.com/guides/claude-artifacts-limitations/ |

---

## Appendix A: Complete System Prompt for Artifact Detection

This is the prompt section to inject into your AI provider's system prompt:

```xml
<artifact_instructions>
When creating content that falls into compatible categories, follow these steps:

1. Before invoking an artifact, think silently in <antThinking> tags:
   - Evaluate against criteria: substantial, self-contained, user will iterate
   - Consider if the content would work fine without an artifact
   - Determine if new artifact or update (most common)

2. Wrap content in <antArtifact> tags with:
   - identifier: kebab-case, descriptive, reuse for updates
   - title: brief human-readable description
   - type: one of the following MIME values

3. Supported types:
   - Code: "application/vnd.ant.code" (include language attribute)
   - Documents: "text/markdown"
   - HTML: "text/html" (single file, no external images, only cdnjs.cloudflare.com)
   - SVG: "image/svg+xml" (use viewBox, not width/height)
   - Mermaid: "application/vnd.ant.mermaid" (raw syntax, not in code block)
   - React: "application/vnd.ant.react" (default export, Tailwind only, no arbitrary values)

4. Usage notes:
   - One artifact per message unless requested
   - Prefer inline when possible — unnecessary artifacts are jarring
   - Do NOT use localStorage or sessionStorage in HTML/React artifacts
   - For React: only react, lucide-react, recharts, and shadcn/ui are available
   - If constraints can't be met, fall back to "application/vnd.ant.code"
   - Err on the side of NOT creating an artifact when unsure
</artifact_instructions>
```

## Appendix B: Reference Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        XZ ARTIFACT SYSTEM                                │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐   ┌─────────────────┐   ┌────────────────────────┐   │
│  │  AI Provider  │   │  System Prompt  │   │  Chat Interface       │   │
│  │  (OpenAI,     │──▶│  + Artifact     │──▶│  + Artifact Panel     │   │
│  │   Google,     │   │  Instructions   │   │  (React + Tailwind)   │   │
│  │   Cerebras)   │   └─────────────────┘   └──────────┬─────────────┘   │
│  └──────────────┘                                     │                  │
│                                                        │                  │
│  ┌─────────────────────────────────────────────────────▼──────────────┐  │
│  │                    DETECTION LAYER                                │  │
│  │  Parse LLM response for <antArtifact> tags                       │  │
│  │  Extract: type, identifier, title, language, content             │  │
│  └────────────────────────────────┬──────────────────────────────────┘  │
│                                   │                                     │
│  ┌────────────────────────────────▼──────────────────────────────────┐  │
│  │                    ROUTING LAYER                                  │  │
│  │                                                                   │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │  │
│  │  │  CODE    │  │  HTML    │  │  REACT   │  │  SVG/MERMAID/MD  │  │  │
│  │  │Mirror    │  │iframe    │  │Sucrase + │  │  Direct render   │  │  │
│  │  │Highlight │  │srcdoc    │  │UMD shim  │  │  (no sandbox)    │  │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    SANDBOX LAYER                                 │  │
│  │  ┌────────────────────────────────────────────────────────────┐  │  │
│  │  │  OUTER IFRAME (separate origin)                            │  │  │
│  │  │  ┌──────────────────────────────────────────────────────┐  │  │  │
│  │  │  │  INNER IFRAME (srcdoc + CSP + sandbox attributes)    │  │  │  │
│  │  │  │  • React component executing                         │  │  │  │
│  │  │  │  • HTML page rendering                               │  │  │  │
│  │  │  │  • SVG rendering                                     │  │  │  │
│  │  │  └──────────────────────────────────────────────────────┘  │  │  │
│  │  └────────────────────────────────────────────────────────────┘  │  │
│  │  Communication: window.postMessage (JSON-RPC)                    │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    STORAGE LAYER                                 │  │
│  │  • Version history (per-artifact, in-memory + localStorage)      │  │
│  │  • Persistent storage (future: IndexedDB → cloud sync)           │  │
│  │  • Published artifact cache (future)                             │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```
