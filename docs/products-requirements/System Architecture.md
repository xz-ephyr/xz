# Superious — System Architecture Document

**Version:** 0.1 — Draft for review  
**Status:** Pre-implementation  
**Depends on:** Foundation Spec, PRD  
**Feeds into:** Component implementation specs, Security Design Document, Tool and API Contract Doc

---

## 1. Purpose

This document defines the system architecture for Superious v1.0. It specifies how components are structured, how they communicate, where trust boundaries exist, and how the implementation satisfies the security, extensibility, and reliability requirements stated in the PRD.

This is the authoritative reference for architectural decisions. Component-level implementation details that do not affect inter-component contracts belong in individual component specs, not here.

---

## 2. Scope

### 2.1 In scope

This document defines:

- Process model and component boundaries
- IPC architecture and command structure
- Provider abstraction layer design
- Database access patterns and schema migration strategy
- Keyring integration architecture
- State management approach
- Streaming response architecture
- Security boundary enforcement mechanisms
- Error propagation strategy
- Network isolation architecture
- File system access controls
- Logging and audit infrastructure
- Extension points for future capabilities

### 2.2 Out of scope

The following are not defined here:

- UI component hierarchy (belongs in UX Spec)
- Detailed database schema (belongs in Data Model Doc)
- Provider-specific API contracts (belongs in Tool and API Contract Doc)
- Specific cryptographic implementations (belongs in Security Design Doc)
- Test infrastructure design (belongs in Test Strategy)
- CI/CD pipeline configuration (belongs in Release and Deployment Doc)

---

## 3. Assumptions

**A1.** Tauri v2 is stable for production use on Windows. IPC command registration, event emission, and allowlist configuration work as documented.

**A2.** The Vercel AI SDK supports streaming responses from multiple providers. Integration pattern with Tauri backend needs verification (see Open Questions).

**A3.** SQLCipher encryption is transparent to SQLite operations once the key is set via `PRAGMA key`. No additional encryption layer is required at the application level.

**A4.** The Windows Credential Manager is accessible from Rust via a stable crate. The `keyring` crate is the current candidate but requires compatibility verification with Tauri v2's security model.

**A5.** React 18+ concurrent rendering is compatible with Tauri's IPC event stream. No custom batching layer is needed for streaming AI responses.

**A6.** SQLite Write-Ahead Logging (WAL) mode provides sufficient crash recovery for the local database without additional transaction coordination.

**A7.** GitHub Actions supports Windows runners with sufficient privileges to sign executables. Code signing infrastructure is available before first release.

**A8.** No component in the expansion layer (Future Capabilities Spec) requires breaking changes to the v1 IPC contract, provider interfaces, or database schema if designed correctly from the start.

---

## 4. Requirements

### 4.1 Architectural requirements

**AR-01.** The architecture must enforce a strict separation between trusted (Rust backend) and untrusted (TypeScript frontend) components. No sensitive operation is callable directly from the frontend without backend mediation.

**AR-02.** The architecture must support adding new AI model providers and search providers without modifying core application logic. Providers are integrated through a common interface.

**AR-03.** The architecture must support versioned database migrations from the first release. No schema changes are permitted without a migration.

**AR-04.** The architecture must isolate network access so that only approved provider domains are reachable from the application. This is enforced at the Tauri configuration layer.

**AR-05.** The architecture must support streaming AI responses to the UI without blocking user interaction or requiring the frontend to manage back-pressure.

**AR-06.** The architecture must preserve all intermediate states (prompts, responses, search results) for session reconstruction and audit purposes.

**AR-07.** The architecture must support crash recovery that restores the last committed session state without user intervention.

**AR-08.** The architecture must provide extension points for future capabilities (plugins, extensions, agent skills) without requiring a rewrite of the core IPC or provider layers.

---

## 5. Architecture and Design Details

### 5.1 Component model

The application is structured as three layers with strict boundary enforcement:

```
┌─────────────────────────────────────────────────────────┐
│ TypeScript/React/Vite Frontend (Renderer Process)      │
│ - UI components                                          │
│ - State management (Zustand or similar)                 │
│ - Vercel AI SDK client                                  │
│ - IPC command invocation                                │
│ - Event listeners for backend streams                   │
└─────────────────────────────────────────────────────────┘
                           │
                    IPC Commands & Events (Tauri)
                           │
┌─────────────────────────────────────────────────────────┐
│ Rust Backend (Main Process)                             │
│ - IPC command handlers                                  │
│ - Provider orchestration                                │
│ - Database access layer                                 │
│ - Keyring access layer                                  │
│ - Network client pool                                   │
│ - Audit logger                                          │
└─────────────────────────────────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              │                         │
┌─────────────▼──────────┐  ┌──────────▼─────────────┐
│ Provider Layer         │  │ Storage Layer          │
│ - AI Model Providers   │  │ - SQLite + SQLCipher   │
│ - Search Providers     │  │ - OS Keyring           │
│ - Provider traits      │  │ - File system (scoped) │
└────────────────────────┘  └────────────────────────┘
```

### 5.2 Process model

**Main process (Rust):**
- Owns the Tauri application lifecycle
- Hosts all IPC command handlers
- Holds database connections
- Accesses OS keyring
- Makes all outgoing network requests
- Emits events to the renderer

**Renderer process (TypeScript/React/Vite):**
- Renders the UI
- Manages local UI state
- Invokes IPC commands with typed payloads
- Listens to backend events for streaming updates
- Never accesses the database, keyring, or network directly

**Security invariant:** No API key, database encryption key, or raw provider credential ever crosses from main to renderer. The renderer sees only sanitized outputs and opaque session identifiers.

### 5.3 IPC architecture

Tauri v2's IPC system is the sole communication mechanism between processes.

#### 5.3.1 Command structure

Commands are defined in Rust and exposed to the frontend through Tauri's `#[tauri::command]` macro. Each command:
- Has a typed input struct
- Returns a typed `Result<T, E>` where `E` is a serializable error type
- Is registered in the Tauri allowlist
- Validates all inputs before executing

**Example command categories:**

| Category | Example commands |
|----------|------------------|
| Session management | `create_session`, `open_session`, `rename_session`, `archive_session`, `export_session` |
| Research flow | `submit_topic`, `approve_plan`, `execute_search`, `extract_claims`, `generate_report` |
| Settings | `add_provider_key`, `remove_provider_key`, `set_default_model`, `get_audit_log` |
| Utility | `clear_cache`, `get_app_version`, `check_database_health` |

#### 5.3.2 Event emission

The backend emits events to the renderer for:
- Streaming AI responses (one event per token or chunk)
- Search progress updates
- Session state changes
- Error notifications

Events are emitted via `app_handle.emit_all()` or targeted `window.emit()`. Event payloads are JSON-serializable and contain no sensitive data.

**Example event types:**

| Event | Payload |
|-------|---------|
| `ai-stream-chunk` | `{ session_id, chunk, finish_reason? }` |
| `search-progress` | `{ session_id, query, results_count, status }` |
| `session-saved` | `{ session_id, timestamp }` |
| `error` | `{ error_type, message, recoverable }` |

#### 5.3.3 Security enforcement

- The Tauri allowlist explicitly enumerates all callable commands. No dynamic command registration is permitted.
- All commands are scoped to the application's allowed CSP domains for network access.
- Commands that access the filesystem are restricted to the app's designated data directory and temp directory.
- No command accepts file paths from the frontend without validation against allowed directories.

### 5.4 Provider abstraction layer

Both AI model providers and search providers are implemented as Rust traits with a common interface. This allows the application to add new providers without modifying core logic.

#### 5.4.1 AI provider trait

**Trait definition (conceptual, exact signature TBD):**

```rust
#[async_trait]
pub trait AIProvider {
    fn name(&self) -> &str;
    fn supported_models(&self) -> Vec<ModelInfo>;
    
    async fn generate(
        &self,
        model: &str,
        prompt: &str,
        context: &GenerationContext,
    ) -> Result<GenerationStream, ProviderError>;
    
    fn supports_streaming(&self) -> bool;
    fn supports_tool_calling(&self) -> bool;
}
```

**Concrete implementations:**
- `OpenAIProvider`
- `AnthropicProvider`
- Additional providers as approved

**Integration with Vercel AI SDK:**
- **Option 1 (preferred):** Rust makes the provider call, streams the response, and emits events to the frontend. The Vercel AI SDK on the frontend consumes these events for UI rendering.
- **Option 2 (fallback):** Rust resolves the API key and constructs a time-limited proxy token or session credential. The frontend uses the Vercel AI SDK to call the provider directly with this credential. The credential expires after the request completes.

**Decision:** Option 1 is preferred for tighter security control. Option 2 is a fallback if the Vercel AI SDK cannot integrate cleanly with Tauri events. This requires verification (see Open Questions).

#### 5.4.2 Search provider trait

**Trait definition (conceptual, exact signature TBD):**

```rust
#[async_trait]
pub trait SearchProvider {
    fn name(&self) -> &str;
    
    async fn search(
        &self,
        query: &str,
        options: &SearchOptions,
    ) -> Result<Vec<SearchResult>, ProviderError>;
    
    async fn fetch_content(
        &self,
        url: &str,
    ) -> Result<PageContent, ProviderError>;
    
    fn supports_parallel_requests(&self) -> bool;
}
```

**Concrete implementations:**
- `BraveSearchProvider` (candidate)
- `TavilySearchProvider` (candidate)
- Additional providers as approved (see Open Questions)

**Content retrieval:**
- The `fetch_content` method retrieves full or partial page content from a URL.
- Content is stored locally in the `source_record` table with the original URL and retrieval timestamp.
- HTML parsing and text extraction are performed in Rust using `scraper` or `html5ever` (library choice TBD).

### 5.5 Database layer

#### 5.5.1 Access pattern

- SQLite is accessed exclusively from the Rust backend.
- The database connection is opened at startup and held for the application lifetime in an application state struct managed by Tauri.
- All queries use parameterized statements. No string concatenation of user input into SQL.

#### 5.5.2 Encryption

- SQLCipher encrypts the database at the page level.
- The encryption key is loaded from the OS keyring at application startup.
- The key is set via `PRAGMA key='...'` immediately after opening the connection.
- No plaintext database file exists on disk.

**Key derivation strategy (TBD):**
- **Option 1:** Generate a random key on first run, store it in the OS keyring. Simple but no portability.
- **Option 2:** Derive the key from a user password using PBKDF2 or Argon2. Requires password entry on every launch unless cached in the OS keyring.
- **Decision:** Option 1 for v1 (local-first, single-machine use). Option 2 deferred to future if team sync or multi-device support is added.

#### 5.5.3 Schema migrations

- Migrations are managed by `sqlx` (preferred) or `refinery` (alternative).
- Migration files are versioned sequentially (`001_initial_schema.sql`, `002_add_audit_log.sql`, etc.).
- Migration state is tracked in a `_sqlx_migrations` or equivalent table.
- On application startup, pending migrations are applied automatically.
- Migration rollback is not supported in v1. Breaking changes require a new migration that preserves existing data.

**Migration enforcement:**
- No schema change is committed to the repository without a corresponding migration file.
- The migration version is checked at compile time where possible (via `sqlx` offline mode).

#### 5.5.4 Connection pooling

- v1 uses a single SQLite connection per application instance.
- WAL mode is enabled for concurrent read/write access if needed.
- Connection pooling (via `sqlx::Pool` or `r2d2`) is deferred to future versions if profiling shows contention.

#### 5.5.5 Performance tuning

**WAL mode:** Enabled for better concurrency and crash recovery.

**Pragmas:**
```sql
PRAGMA journal_mode=WAL;
PRAGMA synchronous=NORMAL;
PRAGMA cache_size=-64000;  -- 64MB cache
PRAGMA temp_store=MEMORY;
```

**Indexing:** All foreign key columns and frequently queried fields (`session_id`, `url`, `created_at`) are indexed.

### 5.6 Keyring integration

#### 5.6.1 Rust crate selection

**Candidate:** `keyring` crate (https://crates.io/crates/keyring)

**Verification required:**
- Compatibility with Tauri v2's security model
- Support for Windows Credential Manager on Windows 10/11
- Behavior when the keyring is unavailable (e.g., locked, no credential vault)

**Alternative:** `windows-rs` for direct Windows API access if the `keyring` crate proves incompatible.

#### 5.6.2 Key storage pattern

- API keys are stored with a service name (`com.superious.app`) and a unique key identifier (e.g., `openai_api_key`, `brave_search_key`).
- The database encryption key is stored with a unique identifier (`db_encryption_key`).
- Keys are written once during settings configuration and read on demand.
- No keys are cached in memory longer than the duration of a single provider call unless the provider maintains a session that requires it.

#### 5.6.3 Error handling

- If the keyring is unavailable at startup, the app fails to launch and displays an error dialog.
- If a key is missing when needed, the operation fails with a clear error message directing the user to settings.
- If a key write fails, the error is surfaced immediately in the settings UI.

### 5.7 State management

#### 5.7.1 Frontend state

**Library:** Zustand (preferred) or Jotai (alternative). Redux is explicitly avoided for complexity reasons.

**State structure:**
```typescript
interface AppState {
  currentSession: Session | null;
  sessions: Session[];
  settings: AppSettings;
  uiState: {
    isSearching: boolean;
    isGenerating: boolean;
    activeStreamId: string | null;
  };
  errors: ErrorState[];
}
```

**State updates:**
- Session data is loaded from the backend via IPC commands.
- UI state (loading flags, active streams) is local to the frontend.
- The backend emits events for state changes (e.g., `session-saved`) that trigger state updates in Zustand.

#### 5.7.2 Backend state

- The Rust backend maintains application state in a `tauri::State<AppState>` struct.
- This includes the database connection, active provider instances, and audit logger.
- State is initialized at application startup and accessed via Tauri's state management.

**Example:**
```rust
struct AppState {
    db: Arc<Mutex<SqliteConnection>>,
    ai_providers: HashMap<String, Box<dyn AIProvider>>,
    search_providers: HashMap<String, Box<dyn SearchProvider>>,
    audit_log: Arc<Mutex<AuditLogger>>,
}
```

### 5.8 Streaming architecture

#### 5.8.1 AI response streaming

**Flow:**
1. Frontend sends `generate_report` IPC command with session ID and prompt.
2. Rust handler validates the request, retrieves the API key from the keyring.
3. Rust calls the AI provider's `generate()` method, which returns a `Stream<Result<String, Error>>`.
4. Rust listens to the stream and emits a Tauri event (`ai-stream-chunk`) for each chunk.
5. Frontend listens to `ai-stream-chunk` events and appends chunks to the UI incrementally.

**Cancellation:**
- The frontend sends a `cancel_generation` IPC command.
- Rust drops the stream, cancels the provider request, and emits a final event with `finish_reason: "cancelled"`.

**Back-pressure:**
- The stream is consumed at the rate the provider delivers it. No frontend back-pressure mechanism is needed in v1.
- If the frontend falls behind, the browser's event queue handles buffering.

#### 5.8.2 Search progress streaming

**Flow:**
1. Frontend sends `execute_search` IPC command with query and provider.
2. Rust submits the query to the search provider.
3. As results arrive, Rust emits `search-progress` events with result counts and status.
4. When the search completes, Rust stores results in the database and emits a final `search-complete` event.

### 5.9 Network isolation

#### 5.9.1 Tauri CSP configuration

The Tauri configuration file (`tauri.conf.json`) restricts outgoing network access to approved domains:

```json
{
  "tauri": {
    "allowlist": {
      "http": {
        "scope": [
          "https://api.openai.com/*",
          "https://api.anthropic.com/*",
          "https://api.search.brave.com/*",
          "https://api.tavily.com/*"
        ]
      }
    }
  }
}
```

**Enforcement:**
- Any network request to a domain not in the allowlist fails at the Tauri layer.
- The allowlist is updated only when a new approved provider is added.

#### 5.9.2 Rust HTTP client

- The Rust backend uses `reqwest` for HTTP requests.
- A shared client is configured with timeouts, retry policies, and custom headers.
- The client is initialized at startup and reused for all provider calls.

**Configuration:**
```rust
let client = reqwest::Client::builder()
    .timeout(Duration::from_secs(30))
    .user_agent("Superious/0.1.0")
    .build()?;
```

### 5.10 Error handling strategy

#### 5.10.1 Error types

**Rust backend:**
- A central `AppError` enum encapsulates all error categories:
  - `DatabaseError`
  - `ProviderError`
  - `KeyringError`
  - `ValidationError`
  - `NetworkError`
- Each variant carries context (session ID, provider name, error message).
- Errors are serializable to JSON for transmission to the frontend.

**Frontend:**
- Errors are represented as objects with `{ type, message, recoverable }` fields.
- Recoverable errors display a retry option; non-recoverable errors display a close option.

#### 5.10.2 Error propagation

- IPC commands return `Result<T, AppError>`.
- On error, the Rust handler logs the error to the audit log and returns the serialized error to the frontend.
- The frontend displays the error in a toast notification or error panel.

#### 5.10.3 Failure recovery

- **Network errors:** Retry up to twice with exponential backoff (1s, 2s). If all retries fail, surface the error.
- **Database errors:** Log the error, display a message, and guide the user to check database health or restore from backup (if available).
- **Keyring errors:** Display a message indicating the keyring is unavailable. Do not fall back to plaintext storage.

### 5.11 File system access

#### 5.11.1 Allowed directories

- **App data directory:** `%APPDATA%\Superious` on Windows. Stores the database, logs, and cached content.
- **Temp directory:** OS temp directory for transient operations. Cleaned on exit.
- **Export directory:** User-selected via Tauri's file dialog API. Write-only access for report exports.

#### 5.11.2 Access restrictions

- The frontend cannot invoke file system operations directly.
- All file operations route through IPC commands that validate paths before executing.
- No command accepts arbitrary file paths from the frontend without validation against allowed directories.

### 5.12 Logging and audit

#### 5.12.1 Application logs

- Rust uses the `tracing` crate for structured logging.
- Log output goes to a file in the app data directory: `Superious/logs/app.log`.
- Log rotation is configured (e.g., daily rotation, max 10 files).
- Sensitive fields (keys, tokens, raw payloads) are excluded at all log levels.

**Log levels:**
- `ERROR`: Unrecoverable errors (database corruption, keyring unavailable)
- `WARN`: Recoverable errors (provider timeout, search failure)
- `INFO`: State changes (session created, search completed)
- `DEBUG`: Detailed flow (IPC commands, provider calls)

#### 5.12.2 Audit log

- The audit log is stored in the SQLite database in an `audit_event` table.
- Events include: provider calls (timestamp, provider, model, session ID), key additions/removals, export events, setting changes.
- The frontend can query the audit log via an IPC command.

**Schema (conceptual):**
```sql
CREATE TABLE audit_event (
    id INTEGER PRIMARY KEY,
    event_type TEXT NOT NULL,
    actor TEXT,
    target_id TEXT,
    target_type TEXT,
    occurred_at INTEGER NOT NULL,
    metadata TEXT
);
```

### 5.13 Extension points for future capabilities

The architecture provides the following extension mechanisms without breaking v1 contracts:

#### 5.13.1 Provider registration

- New AI or search providers are added by implementing the provider trait and registering the implementation at startup.
- No modification to IPC commands or frontend logic is required.

#### 5.13.2 IPC command extension

- New commands are added via `#[tauri::command]` and registered in the Tauri builder.
- Existing commands maintain backward compatibility.

#### 5.13.3 Database schema evolution

- New tables or columns are added via migrations.
- Existing tables are not removed or renamed in-place; deprecation is handled by marking columns as unused and adding new ones.

#### 5.13.4 Plugin/extension loading (future)

- A plugin registry is added as a new IPC command category.
- Plugins are loaded from a designated directory and registered with the provider layer.
- Plugins communicate with the core app through a defined interface (trait-based or IPC-based, TBD in expansion layer design).

---

## 6. Security Considerations

This section summarizes architectural security decisions. The full security model is defined in the Security Design Document.

### 6.1 Trust boundaries

**Boundary 1: Main process ↔ Renderer process**
- Enforced by Tauri's IPC layer
- No sensitive data crosses from main to renderer
- All commands are validated in Rust before execution

**Boundary 2: Application ↔ OS**
- Keyring access mediated by the OS
- File system access restricted by Tauri's allowlist
- Network access restricted by Tauri's CSP

**Boundary 3: Application ↔ External providers**
- All provider calls go through the Rust backend
- Provider responses are validated before storage
- No direct frontend-to-provider communication

### 6.2 Secrets handling

- API keys are stored in the OS keyring only.
- The database encryption key is stored in the OS keyring only.
- No key material is logged, transmitted to the frontend, or written to disk in plaintext.

### 6.3 Input validation

- All IPC command inputs are deserialized into typed structs.
- Rust handlers validate inputs before execution (e.g., session ID exists, URL is well-formed, model name is supported).
- Invalid inputs return typed errors; they do not panic or produce partial side effects.

### 6.4 Audit trail

- All security-sensitive actions are logged to the audit table.
- Logs are tamper-evident (write-only from the app's perspective).
- The audit log is queryable by the user for transparency.

---

## 7. Data Model and Contracts

The full data model is defined in the Data Model and Retention Doc. This section specifies the architectural contracts that enable the data model.

### 7.1 Database schema versioning

- Migrations are sequential and forward-only.
- Each migration has a version number and timestamp.
- Migration state is tracked in the database.

### 7.2 Provider contracts

- AI provider trait: `generate`, `supported_models`, `supports_streaming`, `supports_tool_calling`
- Search provider trait: `search`, `fetch_content`, `supports_parallel_requests`

### 7.3 IPC contracts

- Commands: Defined in Rust, typed inputs/outputs, registered in allowlist
- Events: Defined payload schemas, emitted from Rust, consumed in TypeScript

---

## 8. Failure Modes

### 8.1 Startup failures

| Failure | Behavior |
|---------|----------|
| Database fails to open (wrong key, corruption) | Display error dialog, do not start. Provide recovery path (restore from backup, reset database). |
| Keyring unavailable | Display error dialog, do not start. Direct user to check OS credential vault. |
| Migration fails | Display error dialog with migration version, do not start. Provide rollback path if possible. |

### 8.2 Runtime failures

| Failure | Behavior |
|---------|----------|
| Provider call fails | Log error, emit error event, display error in UI. Allow retry or provider switch. |
| Database write fails | Log error, preserve unsaved work in memory, display error. Attempt auto-save again on next user action. |
| Keyring read fails | Abort the operation, display error. Do not fall back to plaintext. |
| Network timeout | Retry twice, then surface error. Mark the operation as failed in the session log. |

### 8.3 Crash recovery

- On startup after a crash, check the database for uncommitted transactions.
- Restore the last committed session state.
- Display a "session recovered" notification.
- Do not re-execute interrupted AI generation or search operations automatically.

---

## 9. Open Questions

| ID | Question | Impact | Resolution path |
|----|----------|--------|-----------------|
| OQ-A01 | Does the Vercel AI SDK support integration with Tauri IPC events, or must the model call be fully Rust-side? | Affects streaming architecture (§5.8.1) | Test Vercel AI SDK in a Tauri prototype. Document the integration pattern. |
| OQ-A02 | Is the `keyring` crate compatible with Tauri v2's security model on Windows? Are there known issues with Windows Credential Manager access? | Affects keyring integration (§5.6.1) | Review `keyring` crate issues, test in Tauri environment, verify Credential Manager access. |
| OQ-A03 | What is the HTML parsing library for content extraction? `scraper` vs `html5ever` vs `readability-rs`? | Affects search provider implementation (§5.4.2) | Benchmark libraries for performance, evaluate output quality on test pages. |
| OQ-A04 | What is the database encryption key derivation strategy? Random key vs password-derived key? | Affects database layer (§5.5.2) | Decide based on v1 scope (single-machine vs future multi-device). Document decision in Security Design Doc. |
| OQ-A05 | What is the exact schema migration tool? `sqlx` offline mode vs `refinery`? | Affects database layer (§5.5.3) | Evaluate `sqlx` compatibility with SQLCipher, check offline mode support. |
| OQ-A06 | What is the state management library for the frontend? Zustand vs Jotai vs other? | Affects frontend architecture (§5.7.1) | Prototype with both, evaluate boilerplate and TypeScript integration. |
| OQ-A07 | What is the HTTP client retry strategy? Exponential backoff with jitter vs fixed intervals? | Affects network isolation (§5.9.2) | Implement exponential backoff with jitter (standard pattern). Document in error handling strategy. |
| OQ-A08 | What is the maximum session size before performance degrades? Number of sources, claims, or tokens? | Affects database performance tuning (§5.5.5) | Define test scenarios, measure query performance, set soft limits if needed. |
| OQ-A09 | Which approved AI model providers and search providers for v1? | Affects provider layer implementation (§5.4) | Requires product decision from PRD open questions OQ-01 and OQ-02. |

---

## 10. Acceptance Criteria

The architecture is validated when:

**AC-01 — IPC boundary is enforced.** A security audit confirms no API key or database encryption key crosses from main to renderer in any code path.

**AC-02 — Provider abstraction works.** The application successfully switches between at least two AI model providers and two search providers without core logic changes.

**AC-03 — Database encryption is active.** A raw database file on disk is unreadable without the correct key. Verified by attempting to open the database file with `sqlite3` CLI.

**AC-04 — Keyring integration functions.** API keys written to the keyring are retrieved successfully on next launch. Keyring unavailability fails gracefully with a clear error.

**AC-05 — Streaming is responsive.** AI response streaming maintains <200ms UI latency per chunk on a standard connection. No UI blocking or freezing during generation.

**AC-06 — Crash recovery works.** After a simulated crash mid-session, the next launch restores the session to its last committed state within 5 seconds.

**AC-07 — Migration system is stable.** At least two schema migrations are applied successfully on upgrade without data loss. Migration state is tracked correctly.

**AC-08 — Audit trail is complete.** All provider calls, key changes, and export events appear in the audit log with correct timestamps and context.

**AC-09 — Extension points are functional.** A prototype plugin (mock implementation) is registered and invoked through the provider interface without modifying core IPC commands.

**AC-10 — Error handling is robust.** All failure modes listed in §8 are tested and produce the documented behavior. No unhandled panics or silent failures.