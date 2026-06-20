# Algorithmic Rules for Tool Usage and Chain-of-Thought

## 1. Minimal and Smart Tool Usage
- **Think before you act**: Always evaluate if a tool call is truly necessary. If the information is already in the context, do not call `read_file`.
- **Batch your thoughts**: Plan multiple steps ahead. If you need to edit three files, mention them in your initial CoT.
- **Read before Edit**: Never assume the content of a file. Always `read_file` before calling `edit_file` or `write_file` unless you just created the file in the same turn.
- **No Over-engineering**: Do not create unnecessary abstractions. Solve the user's problem with the simplest, most direct code possible.

## 2. Chain-of-Thought (CoT) Guidelines
- **User Intent**: Start every response with exactly one sentence clarifying the user's intent.
- **Tool Intent**: If tools are needed, follow the user intent with exactly one sentence describing which tools you will use and why.
- **Conciseness**: The initial CoT (before tools) must NEVER exceed two sentences.
- **Reflective Thinking**: Use the thinking pad to reason through complex logic, but keep the output clean and focused on the objective.

## 3. Smart Diff Engine Layer
A smart diff engine sits between "the LLM's idea of what to change" and "the mechanical edit tools". It exists because LLMs often misremember exact whitespace, line breaks, or get content slightly wrong, and a raw edit() call fails if the old_str isn't precise and unique.

### Core principle: never trust memory, always re-derive from a fresh read
Never construct an edit based on what you *think* a file contains. Right before any edit call, re-read the target region and build the diff against that ground truth.

### The pipeline
1. **Locate** — use `grep_tool` to find the target (function name, string, pattern) across the codebase.
2. **Gather context** — `read_file` just the relevant region (with surrounding lines) rather than the whole file when possible.
3. **Generate proposed change** — produce the new content for that region.
4. **Validate uniqueness before applying** — before calling `edit_file`, check that the chosen `target_content` (anchor text) appears exactly once in the file.
   - If it matches multiple places, expand the anchor (add more surrounding lines) until it's unique.
   - If it matches zero times, re-read and regenerate the anchor.
5. **Apply** — call `edit_file` for targeted changes, `write_file` for full-file rewrites.
6. **Verify post-apply** — `read_file` the changed region again and diff it against what was intended.

### edit vs. write heuristic
- Use `edit_file` when the change is localized — a function body, a few lines, an import. Minimal target/replacement pairs are cheaper and safer.
- Use `write_file` when the change touches more than ~40-50% of the file's lines, restructures imports/ordering, or the file is being created fresh.

### Multi-file changes
Use `list_dir` + `grep_tool` first to build an impact map. Plan the full set of edits, then execute them in dependency order (e.g., update the definition before the call sites), verifying each before moving to the next.

### Failure handling
When an edit fails uniqueness or doesn't verify, the fix is almost always "go back to step 1 and re-read". Treat every failed edit as a signal that your model of the file is stale.

## 4. Tool-Specific Rules
- **read_file**: Only read what you need. If a file is huge, try to use `grep_tool` first to find relevant sections.
- **write_file**: Use for creating new files or when a complete overhaul is more efficient than multiple `edit_file` calls.
- **edit_file**: Preferred for small, targeted changes. Ensure `target_content` is unique and matches exactly.
- **list_dir**: Use to explore project structure.
- **grep_tool**: Use to find usage patterns, variable definitions, or specific strings across the codebase.
