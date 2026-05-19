superious — Product Requirements Document (PRD)

**Version:** 0.1 — Draft for review
**Status:** Pre-implementation
**Depends on:** Foundation Spec, Future Capabilities Specification
**Feeds into:** Security Design Document, AI Behavior / Agent Spec, Data Model and Retention Doc, Tool and API Contract Doc

---

## 1. Purpose

This document defines what Superious must do, for whom, at what quality bar, and under what constraints. It is the authoritative requirements reference for the MVP and serves as the gate before feature implementation begins.

It does not define how individual components are built internally. Internal design decisions belong in the Architecture Doc and the respective component specs. This document fixes scope so that subsequent technical documents have a stable reference.

---

## 2. Scope

### 2.1 In scope — MVP (v1.0)

The following capabilities are required for the first production release:

**Research sessions**
- Create, open, rename, archive, and export research sessions
- Sessions persist locally across app restarts
- Sessions survive app crashes without data loss

**Topic intake and research planning**
- Accept a topic or task as free-form text
- AI layer produces an explicit research plan before execution begins
- Plan is visible to the user before any external call is made

**Web search and retrieval**
- Submit queries to at least one approved search provider
- Retrieve and store full or partial page content at the source URL
- Store source URL, page title, and retrieval timestamp with every result
- Rank or score results by source quality (criteria TBD — see Open Questions)
- De-duplicate results within a session

**Evidence extraction and citation**
- Extract claims from retrieved content
- Attach each claim to its originating source record
- Preserve inline citation markers in generated text
- Format citations for export (minimum: URL + title + retrieval date)

**AI-assisted synthesis**
- Generate cited summaries from extracted evidence
- Stream responses to the UI without blocking
- Expose the active model, provider name, and generation status at all times
- Flag low-confidence claims rather than asserting them
- Preserve all prompts and model outputs in the session record

**Report drafting and export**
- Compose a report from session evidence and AI output
- Allow the user to edit the draft before export
- Export in at least one structured format (TBD — see Open Questions)

**Local persistence**

- Store all session data in a local SQLite + SQLCipher database
- Auto-save drafts continuously
- Encrypt the database using a key derived from or stored in the OS credential vault

**Settings management**
- Add, edit, and remove provider API keys (stored in OS keyring only)
- Select active AI model and search provider per session or globally
- Clear local cache
- View audit log for sensitive actions

**Secure IPC layer**
- All calls from the TypeScript frontend to sensitive operations route through Tauri's IPC command layer backed by Rust
- No provider key is ever passed to or held in the frontend process

### 2.2 Out of scope — MVP

The following are explicitly excluded from v1.0:

- Collaborative or multi-user sessions
- Cloud synchronization of any kind
- Browser automation or computer-use actions
- Local model inference
- Plugin, extension, or skills loading
- Scheduled or background tasks
- Parallel agent execution
- Private document ingestion
- Voice input or output
- Any form of public access, user registration, or anonymous use
- Telemetry, analytics, or crash reporting (opt-in may be considered post-v1)

### 2.3 Platform scope

| Phase | Platform |
|-------|----------|
| Phase 1 (MVP) | Windows |
| Phase 2 | macOS, Linux |

All requirements in this document apply to Phase 1 unless explicitly annotated otherwise.

---

## 3. Assumptions

The following assumptions are treated as fixed for this document. If any assumption is invalidated, the affected requirements must be reviewed before implementation proceeds.

**A1.** The app is deployed only to known, trusted team members. There is no anonymous or self-serve access path.

**A2.** The Tauri v2 IPC model is used as the sole mechanism for frontend-to-backend communication. No direct Rust FFI from the frontend, no WebSockets to localhost, no shared memory.

**A3.** The Vercel AI SDK is the abstraction layer for all model provider calls from the TypeScript side. Calls that require key handling or rate-limiting pass through the Rust backend via IPC first.

**A4.** SQLite with SQLCipher is the only local database. No secondary database engine is introduced in v1.

**A5.** The OS-native credential vault (Windows Credential Manager in Phase 1) is the only acceptable location for API keys and database encryption material. These values are never written to disk in plaintext.

**A6.** No data leaves the machine except through explicit, user-initiated calls to approved external providers (search, AI model). There is no background sync, no telemetry, and no analytics in v1.

**A7.** The expansion layer described in the Future Capabilities Specification is not built in v1 but the core architecture must not prevent it. IPC contracts, provider interfaces, and storage schemas must be designed with extensibility in mind from the start.

**A8.** GitHub Actions is the CI/CD system. Build artifacts must be signed before distribution. The signing configuration must be in place before the first production release.

---

## 4. Requirements

Requirements are grouped by functional area. Each requirement carries a priority: **MUST** (required for v1.0), **SHOULD** (strongly preferred for v1.0, deferrable with justification), or **FUTURE** (explicitly post-v1 per current scope).

### 4.1 Session management

| ID | Priority | Requirement |
|----|----------|-------------|
| SM-01 | MUST | A user can create a new research session with a name and optional description. |
| SM-02 | MUST | A user can reopen any previously saved session from a session list view. |
| SM-03 | MUST | A user can rename a session at any time. |
| SM-04 | MUST | A user can archive a session. Archived sessions are hidden from the default view but remain accessible and searchable. |
| SM-05 | MUST | A user can export a session. Export format is TBD (see Open Questions). |
| SM-06 | MUST | Sessions are saved to the local database automatically. No explicit save action is required to avoid data loss. |
| SM-07 | MUST | The app recovers the last known good state of a session after a crash. |
| SM-08 | SHOULD | A user can duplicate a session as a starting point for a new research task. |
| SM-09 | FUTURE | Sessions can be shared with other team members through a sync mechanism. |

### 4.2 Topic intake and research planning

| ID | Priority | Requirement |
|----|----------|-------------|
| TI-01 | MUST | A user can enter a topic or task as free-form text to begin a session. |
| TI-02 | MUST | The AI layer generates a structured research plan from the topic before any external call is made. |
| TI-03 | MUST | The research plan is rendered in the UI and the user must be able to review it before approving execution. |
| TI-04 | MUST | The user can edit or reject the research plan before it runs. |
| TI-05 | SHOULD | The user can refine or reframe the topic after seeing an initial plan, without losing session context. |

### 4.3 Web search and retrieval

| ID | Priority | Requirement |
|----|----------|-------------|
| SR-01 | MUST | The system submits queries to at least one configured search provider. |
| SR-02 | MUST | The system stores the full source URL, page title, and UTC retrieval timestamp for every result. |
| SR-03 | MUST | The system retrieves page content (full or excerpt) for each result and stores it locally. |
| SR-04 | MUST | Results within a session are de-duplicated by normalized URL. |
| SR-05 | MUST | The system supports configuring multiple search providers and selecting between them. |
| SR-06 | SHOULD | The system ranks or scores results by source quality. Ranking criteria must be documented in the Tool Contract Doc. |
| SR-07 | SHOULD | The system marks each result with a freshness indicator based on publication or retrieval date. |
| SR-08 | SHOULD | Search runs in parallel where the provider API allows it and the implementation is safe. |
| SR-09 | FUTURE | A browser-use adapter enables interaction with pages beyond static retrieval. |

### 4.4 Evidence extraction and citation

| ID | Priority | Requirement |
|----|----------|-------------|
| EC-01 | MUST | The system extracts discrete claims from retrieved source content. |
| EC-02 | MUST | Each claim is stored with a reference to the source record it was extracted from. |
| EC-03 | MUST | Every claim used in a generated output carries an inline citation marker. |
| EC-04 | MUST | Citations include at minimum: source URL, page title, and retrieval timestamp. |
| EC-05 | MUST | Citations are exportable in a structured format alongside the report. |
| EC-06 | MUST | The system never fabricates a citation. If a claim cannot be traced to a stored source, it must be flagged, not silently asserted. |
| EC-07 | SHOULD | Citation format is configurable (e.g. inline numeric, footnote, bibliography block). Minimum: one working format for v1. |

### 4.5 AI-assisted synthesis

| ID | Priority | Requirement |
|----|----------|-------------|
| AI-01 | MUST | The system connects to at least one external AI model provider through the Vercel AI SDK. |
| AI-02 | MUST | AI responses stream to the UI without blocking user interaction. |
| AI-03 | MUST | The active provider name and model identifier are visible in the UI at all times during generation. |
| AI-04 | MUST | Generation state (idle, planning, generating, stopped, error) is visible in the UI. |
| AI-05 | MUST | The system preserves every prompt sent to a model and every response received, as part of the session record. |
| AI-06 | MUST | The AI layer separates facts, assumptions, and recommendations in its output. |
| AI-07 | MUST | The AI layer flags uncertainty rather than generating unsupported assertions. |
| AI-08 | MUST | The AI layer stops and reports an error if evidence is insufficient to support a requested output. |
| AI-09 | MUST | The AI layer does not make provider calls outside the approved session flow. |
| AI-10 | MUST | A user can cancel an in-progress AI generation. |
| AI-11 | SHOULD | The user can switch the active model or provider between sessions. Switching mid-session is FUTURE. |
| AI-12 | FUTURE | Local model inference is supported through the same provider interface. |

### 4.6 Report drafting and export

| ID | Priority | Requirement |
|----|----------|-------------|
| RD-01 | MUST | The app assembles a structured report from session evidence and AI-generated synthesis. |
| RD-02 | MUST | The user can edit the report draft before exporting. |
| RD-03 | MUST | The exported report includes all citations referenced in the text. |
| RD-04 | MUST | Export format: TBD (see Open Questions). At minimum one human-readable format and one machine-readable format are required. |
| RD-05 | SHOULD | The app preserves a history of draft versions within the session. |

### 4.7 Local persistence

| ID | Priority | Requirement |
|----|----------|-------------|
| LP-01 | MUST | All session data is stored in a local SQLite database encrypted with SQLCipher. |
| LP-02 | MUST | The SQLCipher key is derived from or stored in the OS-native credential vault. It is never written to disk in plaintext. |
| LP-03 | MUST | Drafts are auto-saved continuously. The auto-save interval must be short enough that a crash loses no more than a few seconds of work. Exact interval: TBD. |
| LP-04 | MUST | The app restores the last stable session state after a crash, without prompting the user to resolve conflicts in v1. |
| LP-05 | MUST | Cached page content and source snapshots are stored locally and linked to their session. |
| LP-06 | SHOULD | The user can clear cached content for a session or globally without deleting session metadata. |
| LP-07 | FUTURE | Storage schema supports team synchronization without a migration-breaking change to the core model. |

### 4.8 Settings management

| ID | Priority | Requirement |
|----|----------|-------------|
| ST-01 | MUST | A user can add, edit, and delete API keys for AI model providers. Keys are stored only in the OS keyring and never appear in the frontend after entry. |
| ST-02 | MUST | A user can add, edit, and delete API keys for search providers under the same security rules. |
| ST-03 | MUST | A user can select the default AI model and provider. |
| ST-04 | MUST | A user can select the default search provider. |
| ST-05 | MUST | A user can clear the local content cache. |
| ST-06 | MUST | A user can view the audit log of sensitive app actions (provider calls, key changes, export events). |
| ST-07 | SHOULD | Settings can be exported and imported in a safe format. API keys must be excluded from any export. |

### 4.9 Extensibility constraints (v1 design requirements)

These requirements apply to v1 architecture decisions, not to shipping the expansion layer itself.

| ID | Priority | Requirement |
|----|----------|-------------|
| EX-01 | MUST | The AI provider interface is defined as an abstract contract. Any model provider is added by implementing the contract, not by modifying core logic. |
| EX-02 | MUST | The search provider interface is defined as an abstract contract with the same constraint. |
| EX-03 | MUST | The IPC command layer is structured so that new Rust-backed commands can be added without restructuring existing ones. |
| EX-04 | MUST | The local database schema uses versioned migrations from day one. No migration-free schema changes are permitted after the first release. |
| EX-05 | MUST | The core app does not import or link against any third-party automation library directly. Future automation capabilities enter through adapter modules only. |

---

## 5. Architecture and Design Details

### 5.1 Process model

The app runs as a Tauri v2 application with two processes:

**Main process (Rust):** Owns the OS integration, IPC command handler, database access, keyring access, filesystem operations, and all outgoing network calls. No secret material crosses from this process to the renderer.

**Renderer process (TypeScript/React/Vite):** Owns UI state, user interaction, and presentation. Communicates with the main process exclusively through Tauri's typed IPC command interface. It holds no API keys, no database handles, and no raw provider credentials at any point.

### 5.2 IPC boundary rules

- All IPC commands exposed to the renderer must be explicitly declared in the Tauri allowlist.
- The renderer invokes commands by name with typed arguments. The Rust handler validates all inputs before acting.
- Events emitted from the backend to the renderer carry only safe, sanitized payloads. No raw provider responses are forwarded without scrubbing.
- Streaming AI output is delivered to the renderer through Tauri events, not through a direct WebSocket or open HTTP stream from the renderer.

### 5.3 Provider layer

Both the AI model provider and the search provider are implemented as traits in Rust with a common interface. The Vercel AI SDK handles streaming and model interaction on the TypeScript side but does so only after the Rust backend has validated the request and resolved the API key from the keyring.

**Preferred pattern for AI calls:**
1. Renderer sends a typed IPC command with the task parameters (no key material).
2. Rust handler retrieves the key from the OS keyring.
3. Rust handler constructs the outbound request and calls the provider.
4. Response is streamed back to the renderer via Tauri events.

This means the Vercel AI SDK is used in the TypeScript layer for response handling and UI streaming, but the key and the outbound call originate from Rust. If the Vercel AI SDK does not support this split cleanly, the model call may be made entirely in Rust and the SDK used only for parsing and streaming on the frontend side. This requires verification against the current SDK architecture.

### 5.4 Database layer

- SQLite is accessed from the Rust process only. The renderer never holds a database handle.
- SQLCipher encryption is applied at the SQLite level. The encryption key is loaded from the OS keyring at startup and held in memory in the Rust process for the session lifetime.
- All schema changes are applied through a versioned migration system (e.g., `sqlx` migrate or equivalent). The migration state is tracked in the database itself.
- Sensitive fields (e.g., provider settings, session metadata with internal details) are stored in encrypted form even within the encrypted database where the field-level sensitivity warrants it.

### 5.5 Keyring access

- Keyring operations are performed only in the Rust backend.
- The Windows Credential Manager is used in Phase 1 via an appropriate Rust crate (needs version-stable crate selection — TBD).
- Keys are written once during settings configuration. They are read at the moment of use and not cached in memory beyond the duration of a single provider call unless a connection pool or session token requires it.

### 5.6 Logging and audit

- The app maintains an audit log of security-relevant events in the local database: provider API calls (timestamp, provider, model, session ID — no key or payload content), key additions and removals, export events, and setting changes.
- Standard application logs must never include key values, token values, or raw provider payloads.
- Log verbosity level is configurable but sensitive fields are excluded at all verbosity levels.

---

## 6. Security Considerations

Security requirements for this document are a subset of what will be fully specified in the Security Design Document. The constraints below are binding on this PRD and cannot be relaxed without a corresponding Security Design Document update.

**S-01 — No key in frontend.** API keys must never appear in the renderer process. This includes in-memory variables, IPC payloads, log output, error messages, or developer tools.

**S-02 — Encrypted at rest.** The local database is encrypted with SQLCipher. The encryption key originates from the OS keyring.

**S-03 — IPC input validation.** Every IPC command handler validates its inputs in Rust before executing. Invalid inputs return typed errors; they do not panic or produce partial side effects.

**S-04 — Outbound network restriction.** Outgoing network requests are restricted to approved provider domains. Tauri's CSP and allowlist configuration is the enforcement mechanism. Any provider added to the system must be added to the allowlist explicitly.

**S-05 — No arbitrary execution.** The frontend cannot trigger shell commands, filesystem writes outside the designated app data directory, or subprocess execution. These paths do not exist in the v1 IPC surface.

**S-06 — Audit trail completeness.** Every action that makes a call to an external provider, writes to the database, or reads from the keyring is recorded in the audit log.

**S-07 — Crash state safety.** On crash recovery, the app must not re-execute the last incomplete agent action automatically. Recovery restores UI state only.

**S-08 — No silent background activity.** The app performs no network calls, no database writes, and no AI generation while in the background or after the user has closed the active session, unless a future scheduled task feature is explicitly enabled by the user.

---

## 7. Data Model and Contracts

The full data model is defined in the Data Model and Retention Doc. The following are the minimum entities required by this PRD. Each entity must have a defined owner, a retention rule, and a deletion path before it is implemented.

| Entity | Key fields | Owner | Retention note |
|--------|-----------|-------|----------------|
| `research_session` | id, name, created_at, updated_at, archived, status | local user | Retained until explicitly deleted or archival policy applied (TBD) |
| `topic` | id, session_id, text, created_at | session | Retained with session |
| `research_plan` | id, session_id, plan_text, approved_at, created_at | session | Retained with session |
| `search_query` | id, session_id, query_text, provider, executed_at | session | Retained with session |
| `source_record` | id, session_id, url, title, retrieved_at, content_snapshot | session | Content snapshot may be cleared on cache purge; metadata retained |
| `claim` | id, session_id, source_record_id, claim_text, extracted_at | session | Retained with session |
| `citation` | id, claim_id, source_record_id, citation_format, created_at | session | Retained with session |
| `draft_report` | id, session_id, body, version, saved_at | session | Version history per session; TBD max versions |
| `prompt_record` | id, session_id, prompt_text, model, provider, sent_at | session | Retained with session for auditability |
| `model_response` | id, prompt_record_id, response_text, finished_at, finish_reason | session | Retained with session |
| `provider_setting` | id, provider_type, provider_name, model_name, created_at | local user | Deleted on user removal of provider |
| `audit_event` | id, event_type, actor, target_id, target_type, occurred_at, metadata | system | Retention policy TBD |

**Key relationships:**
- A `research_session` contains many `topic`, `search_query`, `source_record`, `claim`, `citation`, `draft_report`, `prompt_record`, and `audit_event` records.
- A `claim` is always linked to exactly one `source_record`.
- A `citation` is always linked to exactly one `claim` and one `source_record`.
- A `model_response` is always linked to exactly one `prompt_record`.

**Tool contracts** for search tools, model tools, and the citation tool are specified in the Tool and API Contract Doc. This PRD does not define tool internals.

---

## 8. Failure Modes

The following failure modes must be handled before the v1 release gate. Each requires a defined behavior, not just an error message.

| Failure | Required behavior |
|---------|-------------------|
| Search provider returns an error or times out | Display an error state in the UI. Store the failed query in the session log with the error code. Do not silently retry more than twice. Allow the user to retry manually. |
| Search provider returns no results | Display an explicit "no results" state. Do not generate a report from an empty evidence set. Allow the user to broaden the query or switch providers. |
| AI model provider returns an error | Stop generation. Display the error type (not the raw API error body) to the user. Store the failed prompt in the session record. Allow the user to retry with the same or a different provider. |
| AI model provider times out mid-stream | Stop the stream. Preserve whatever partial output was received. Mark the response as incomplete in the session record. Allow retry. |
| SQLCipher database fails to open (wrong key, corruption) | Display a clear error. Do not attempt to create a new empty database silently. Surface a path to recovery (documentation link or support contact). |
| OS keyring is unavailable | Block any operation that requires a provider key. Display an error explaining that the credential vault is unavailable. Do not fall back to plaintext storage. |
| App crash during AI generation | On restart, restore the session to the last auto-saved state. Do not re-execute the interrupted generation. Show a "session recovered" notice. |
| App crash during database write | SQLite WAL mode should protect against partial writes. On next open, the database rolls back to the last committed transaction. No user action required unless the database is found corrupted. |
| Export fails (e.g., target path not writable) | Display an error with the specific reason. Do not silently discard the export. The draft is preserved in the session regardless. |
| Network unavailable | Search and AI generation are unavailable. Display a clear offline state. Local session work (editing a draft, reviewing existing evidence) must continue to function. |

---

## 9. Open Questions

These are unresolved decisions that block specific requirements. Each must be answered and recorded in the appropriate spec before implementation of the dependent feature begins.

| ID | Question | Blocks |
|----|----------|--------|
| OQ-01 | Which AI model providers are approved for v1? (e.g., OpenAI, Anthropic, others?) | AI-01, ST-01 |
| OQ-02 | Which search providers are approved for v1? (e.g., Brave Search, Tavily, Bing Web Search API?) | SR-01, ST-02 |
| OQ-03 | What is the minimum citation standard for a report to be considered valid? (i.e., what combination of URL, title, date, and excerpt is required?) | EC-04, EC-07 |
| OQ-04 | What export formats are required for reports and sessions? (e.g., Markdown + JSON, PDF, HTML?) | RD-04, SM-05 |
| OQ-05 | What is the retention policy for research sessions? Is there a maximum age or storage limit? | SM-04, Data Model |
| OQ-06 | Who can access the app and what is the access revocation process? (Is access controlled by machine, by an identity provider, or by a manually distributed build?) | Access model, Security Design Doc |
| OQ-07 | What data is permitted to leave the machine? Is the content of retrieved pages sent to the AI provider in full, or only extracted claims? This directly affects privacy design and provider API cost. | SR-03, AI-09, Privacy requirements |
| OQ-08 | What is the source quality ranking criteria? (Domain authority, recency, TLD, custom allowlist?) | SR-06, Tool Contract Doc |
| OQ-09 | What Rust crate is used for OS keyring access on Windows? Needs evaluation of `keyring` crate stability and Tauri v2 compatibility. | ST-01, LP-02 |
| OQ-10 | Does the Vercel AI SDK support a split-call model where the outbound request originates from Rust? If not, is a fully Rust-side model call acceptable, with the SDK used only for frontend streaming? | AI-01, Architecture §5.3 |
| OQ-11 | What is the auto-save interval for draft content? | LP-03 |
| OQ-12 | What is the maximum number of draft versions retained per session before older versions are pruned? | RD-05, Data Model |
| OQ-13 | Is there a maximum session size (number of sources, claims, or tokens) enforced in v1, or is this left to user and storage constraints? | SM-07, Performance requirements |

---

## 10. Acceptance Criteria

The following criteria define when v1.0 requirements are met. All must pass before the release gate. Detailed test cases are in the Test Strategy document.

**Session management**
- A user can create a session, close the app, reopen it, and find the session with all content intact.
- A session subjected to a simulated crash recovers to its last auto-saved state on the next launch.
- A user can archive a session and confirm it is absent from the default list but accessible via archived view.
- A session export produces a file that contains all sources, claims, citations, and the final report draft.

**Research planning**
- Entering a topic produces a visible research plan before any external provider call is made.
- The user can reject the plan and revise the topic without corrupting the session.

**Search and retrieval**
- A submitted query returns results from the configured provider with URL, title, and timestamp stored for each.
- Submitting the same URL twice within a session results in one de-duplicated source record.
- A provider error produces a visible error state and a log entry; the session remains intact.

**Evidence and citation**
- Every claim in a generated output has a citation marker referencing a stored source record.
- A search of the local database for any exported citation returns the originating source record.
- No claim appears in a generated output that cannot be traced to a stored source.

**AI generation**
- Streaming responses appear incrementally in the UI without blocking navigation.
- The provider name and model ID are visible throughout generation.
- Canceling generation mid-stream stops the call, preserves partial output, and marks the response as incomplete.
- A failed provider call produces an error state and a log entry; it does not corrupt the session.

**Security**
- Inspecting the renderer process memory, network requests, and IPC payloads produces no API key values at any point.
- The database file on disk is not readable as plaintext by a SQLite client that does not have the encryption key.
- A simulated keyring unavailability prevents provider calls and surfaces a clear error; it does not fall back to plaintext key storage.

**Performance**
- Cold app start completes in under [TBD — benchmark on target hardware before setting a hard number].
- A session with [TBD number] sources and claims loads fully within [TBD] seconds.
- AI streaming does not drop below [TBD] tokens/second on a standard connection with the approved providers.

**Release gate**
- Security review is complete and findings are resolved.
- IPC boundaries are audited against the allowlist.
- Secrets handling is validated by inspection of the codebase and runtime behavior.
- Crash recovery has passed at least [TBD] crash simulation test runs.
- Citation integrity is verified: no fabricated citations in [TBD] test sessions.
- Provider abstraction is demonstrated to work with at least two distinct model providers and two distinct search providers.
- Build artifacts are signed and update signing is verified.
