# Coding Environment (ProjectIDE) — Feature Ideas

> **Date:** 2026-06-23
> **Currently:** `src/components/artifacts/ProjectIDE.tsx` — file tree + CodeMirror editor with save/close
> **Also relevant:** `FileSystemService.ts`, `ArtifactRenderer.tsx`, `ArtifactPane.tsx`, `CodeBlock.tsx`

---

## Current Capabilities

- Browse project folder tree (desktop: native FS, web: in-memory FS + localStorage)
- Open/edit files with CodeMirror syntax highlighting (17+ languages)
- Save files to disk
- Breadcrumb navigation with sibling file browsing
- Status bar: cursor position, language, encoding, indentation
- AI can read/write/edit/grep/list files via tools

---

## Proposed Features

### 1. Terminal / Shell Integration

| Feature | Description |
|---------|-------------|
| **Integrated terminal panel** | Split-panel or toggleable terminal at the bottom of the IDE. Xterm.js + pty for desktop (Tauri), pseudo-terminal or command list for web. |
| **Run npm/pip commands** | Let the user (or AI) run `npm install`, `npm run build`, `pip install`, etc. directly in the IDE. |
| **AI-controlled terminal (sandboxed)** | AI can execute approved commands. User reviews before execution (consent dialog). |
| **Output capture** | Terminal output captured and injectable as context for the AI ("build failed with these errors..."). |

**Why:** Without a terminal, the AI can read/write code but cannot run, build, test, or install anything. This is the single biggest gap.

**Library options:** `xterm.js` + `@tauri-apps/plugin-shell` (Tauri desktop), or `node-pty` via Tauri backend.

---

### 2. Git Integration

| Feature | Description |
|---------|-------------|
| **Branch indicator** | Show current branch in status bar. |
| **File status colors** | Modified/added/deleted indicators on file tree nodes (green/red/yellow dots). |
| **Diff view** | Side-by-side or inline diff when opening a modified file (vs HEAD). |
| **AI git tools** | `git_commit`, `git_diff`, `git_log`, `git_status`, `git_push` tools for the AI. |
| **Git graph** | Visual commit history within the IDE. |
| **Undo/restore via git** | "Restore to previous version" uses git checkout. |

**Why:** Git is essential for real development. Currently the AI can edit files but has no awareness of version control.

---

### 3. Multi-Tab Editor

| Feature | Description |
|---------|-------------|
| **Tab bar** | Open multiple files simultaneously in tabs at the top of the editor area. |
| **Tab management** | Close, reorder, split tabs. Unsaved indicator (dot) on modified files. |
| **Split view** | Side-by-side editing (vertical or horizontal split). |

**Why:** Currently only one file can be open at a time. Real development requires bouncing between files.

---

### 4. File Operations (UI)

| Feature | Description |
|---------|-------------|
| **Context menu on file tree** | Right-click: Rename, Delete, Duplicate, New File, New Folder. |
| **Drag-and-drop files** | Move files/folders within the tree. |
| **Drag from OS** | Drop external files into the project to import them (Tauri desktop). |
| **Image preview** | Click an image file in the tree to preview it in the editor area. |

---

### 5. Code Intelligence

| Feature | Description |
|---------|-------------|
| **Linting / diagnostics** | Show lint errors inline in CodeMirror (ESLint, stylelint). |
| **Autocomplete / intellisense** | Language server protocol (LSP) integration via CodeMirror extensions. `typescript-language-server`, `css-languageserver`, etc. |
| **Go to definition** | Click a symbol to navigate to its definition. |
| **Find references** | Show all usages of a symbol. |
| **Inline error markers** | Red squiggles, hover to see error message. |

**Library options:** `codemirror-languageserver`, or CodeMirror 6's own LSP integration packages.

---

### 6. AI-Powered Features

| Feature | Description |
|---------|-------------|
| **Inline AI edit** | Select code in editor → "Ask AI to refactor this" → inline diff suggestion. |
| **AI chat in IDE** | A chat panel embedded in the IDE (like GitHub Copilot Chat). |
| **AI code actions** | "Explain this", "Fix lint errors", "Add comments", "Write tests" buttons in the editor. |
| **File-aware AI context** | When AI edits a file, scroll the editor to the changed lines and highlight them. |
| **AI-generated file creation** | AI creates a file → it appears in the tree + opens in a tab automatically. |

---

### 7. Preview / Dev Server

| Feature | Description |
|---------|-------------|
| **Live preview** | Embedded browser viewport showing the running app (like VS Code's Simple Browser). |
| **Hot reload support** | Detect file changes and auto-refresh preview. |
| **Mobile viewport toggle** | Preview at different screen sizes (375px, 768px, 1024px). |
| **Log console** | Browser console output (console.log, errors) shown in a panel within the IDE. |

---

### 8. Editor Customization

| Feature | Description |
|---------|-------------|
| **Theme toggle** | Light / dark / high-contrast modes for CodeMirror. |
| **Font size control** | Slider or preset selector in settings. |
| **Tab size / indentation** | Configurable spaces vs tabs per file type. |
| **Minimap** | Code outline on the right side of the editor. |
| **Word wrap toggle** | Soft wrap long lines. |
| **Line numbers toggle** | Show/hide line numbers gutter. |

---

### 9. Project-Wide Search

| Feature | Description |
|---------|-------------|
| **Find in files** | Search UI with results grouped by file, click to navigate. |
| **Replace across files** | Find + replace with preview of changes. |
| **File search (fuzzy)** | Quick file search via Ctrl+P (fuzzy filename matching). |

Currently only the AI's `grep_tool` can search across files — there's no UI for it.

---

### 10. Debugging

| Feature | Description |
|---------|-------------|
| **Breakpoint support** | Click gutter to set breakpoints (Tauri: Chrome DevTools Protocol). |
| **Variable inspector** | Watch panel showing local/global variables. |
| **Call stack** | Stack trace panel. |
| **Step controls** | Step over, step into, step out, continue. |

**Note:** This is the most complex feature. Only feasible with Tauri desktop backend using Chrome DevTools Protocol or a Node.js debugger adapter.

---

### 11. Collaboration

| Feature | Description |
|---------|-------------|
| **Share project** | Generate a share link that opens a read-only or collaborative view. |
| **Cursor presence** | See other users' cursors in the file (WebRTC / WebSocket). |
| **Live chat in IDE** | Side panel with the AI assistant while browsing code. |

---

### 12. File Diff & Review

| Feature | Description |
|---------|-------------|
| **Unsaved changes indicator** | Dot on file tab / tree node when file is modified. |
| **Diff editor** | Side-by-side or unified diff view when saving vs previous version. |
| **AI change review** | "Show me what the AI changed" — highlights added/removed lines. |
| **Staged changes** | Like git staging — review AI changes before accepting them. |

---

## Implementation Priority

| Priority | Feature | Effort | Impact |
|----------|---------|--------|--------|
| 1 | **Terminal / shell integration** | High | Critical — unblocks build/run/test |
| 2 | **File operations (UI context menu)** | Low | High — basic UX gap |
| 3 | **Multi-tab editor** | Medium | High — essential for real work |
| 4 | **Git integration (file status + AI tools)** | Medium | High — version control awareness |
| 5 | **Project-wide search UI** | Medium | High — find in files |
| 6 | **AI inline edits + code actions** | Medium | High — core AI-IDE interaction |
| 7 | **Editor customization (theme, font, etc.)** | Low | Medium — quality of life |
| 8 | **File diff / change review** | Medium | Medium — trust & visibility |
| 9 | **Linting / diagnostics** | Medium | Medium — code quality |
| 10 | **Live preview / dev server** | High | Medium — visual feedback |
| 11 | **Autocomplete / LSP** | High | Medium — developer experience |
| 12 | **Debugging** | Very High | Low — most complex, least used |

---

## Existing Code to Reuse / Extend

| What | Where | For |
|------|-------|-----|
| CodeMirror editor | `ProjectIDE.tsx`, `CodeBlock.tsx`, `ArtifactRenderer.tsx` | Already the editor foundation — extend with tabs, LSP, themes |
| File tree | `FileNode.tsx` + `ProjectIDE.tsx` | Add context menu, drag-drop, file status colors |
| File system abstraction | `FileSystemService.ts` | Already abstracts desktop/web — extend for new operations (rename, delete, mkdir) |
| Path resolution | `lib/projectPaths.ts` | Already handles traversal protection |
| Language detection | `lib/languageUtils.ts` | Already maps extensions to CodeMirror modes |
| Tool system | `services/ai/tools/*.ts` | Add git, terminal, and project management tools |
| Artifact rendering | `ArtifactRenderer.tsx` | Combine with live preview |
| Settings modal | `components/settings/SettingsModal.tsx` | Add editor settings (theme, font, tab size) |
| Tauri plugins | `@tauri-apps/plugin-fs`, `@tauri-apps/plugin-dialog` | Already used — add `@tauri-apps/plugin-shell` for terminal |
| Toast notifications | `components/ui/Toast.tsx` | Notifications for save, errors, git operations |
| Hugeicons | `@hugeicons/core-free-icons` | Icons for new features (terminal, git, search, etc.) |
