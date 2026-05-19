# Superious — Coding Agent Rules

## RULE 01 — Tauri v2 Technical Precision [CRITICAL]
- This project uses **Tauri v2**. Never use v1 syntax (e.g., deprecated `tauri::command` patterns or old JS API paths).
- If you are unsure about a v2 API (e.g., the new plugin system, mobile-ready events, or the `invoke` signature), you **must** use Google Search to verify the current stable documentation.
- **NEVER** guess the capability or permission system configuration; consult the `tauri.conf.json` or v2 docs first.

## RULE 02 — IPC Boundary Integrity [NON-NEGOTIABLE]
- The TypeScript frontend is an **untrusted zone**. It must never attempt direct access to the Database, Filesystem, or OS Keyring.
- All sensitive operations must be implemented as a Rust `#[tauri::command]` that performs its own validation.
- Every IPC command must return a serializable `Result<T, AppError>` where `AppError` is a project-defined enum.

## RULE 03 — Strict Type Synchronization [REQUIRED]
- Any modification to a Rust `struct` or `enum` that crosses the IPC boundary must be immediately reflected in the TypeScript types.
- Do not use `any` in TypeScript for IPC payloads. Use specific interfaces that match the Rust definitions exactly.

## RULE 04 — Database & Migration Hygiene [CRITICAL]
- **No Raw SQL Strings:** Never interpolate variables directly into SQL. Always use parameterized queries via `sqlx`.
- **Migration First:** Any schema change must be implemented as a new sequential migration file in the `src-tauri/migrations/` folder.
- Do not modify existing migration files. Only add new ones.

## RULE 05 — Keyring & Secret Safety [CRITICAL]
- Never propose code that logs, prints, or transmits raw secrets (API keys, DB encryption keys).
- Secrets retrieved from the OS Keyring must be used immediately in a provider call and dropped as soon as possible.
- Never pass raw API keys to the frontend.

## RULE 06 — Async and Event Loop Protection [REQUIRED]
- Never block the Tauri main thread with heavy computation or synchronous network calls.
- Use `tokio` tasks or `async` traits for all provider calls, web searches, and file processing.
- Ensure all streaming responses (tokens/chunks) are emitted via Tauri events to prevent UI freezing.

## RULE 07 — Network Isolation Compliance [REQUIRED]
- Before adding a new external service, check `tauri.conf.json` to ensure the domain is within the CSP `allowlist`.
- If a new domain is required, you must explicitly flag this change to the user before modifying the configuration.

## RULE 08 — Audit-Log-First Development [REQUIRED]
- Every feature that initiates an external provider call (AI or Search) must include code to log the event to the `audit_event` database table.
- Every key change or export event must also be audited.

## RULE 09 — Architectural Traceability [ALWAYS]
- When implementing a new command or module, reference the specific section of the `Architecture Document` or `PRD` it addresses in the PR description or code comments.
- If a task requires deviating from the established architecture, stop and ask the user for confirmation first.

## RULE 10 — Zero Hallucination Policy [CRITICAL]
- If you cannot find a specific crate, library method, or internal utility — **Admit it.**
- Do not invent "standard" libraries that don't exist in the Rust or React ecosystems.
- Use `grep_search` to verify if a utility exists in the project before creating a duplicate.

*End of rules.md*
