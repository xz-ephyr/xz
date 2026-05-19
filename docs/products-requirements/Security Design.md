# Superious — Security Design Document

**Version:** 0.1 — Draft for review  
**Status:** Pre-implementation  
**Depends on:** Foundation Spec, PRD, System Architecture Document  
**Feeds into:** Component implementation specs, Test Strategy, Runbook

---

## 1. Purpose

This document defines the security model for Superious v1.0. It specifies threat boundaries, cryptographic strategies, secrets management, access controls, attack surface constraints, and security validation requirements that must be satisfied before the first production release.

This is the authoritative reference for security-critical implementation decisions. Any deviation from this document requires a formal security review and an updated ADR.

---

## 2. Scope

### 2.1 In scope

This document defines:

- Threat model and attack vectors
- Process isolation and trust boundaries
- Cryptographic key management and storage
- API key and credential handling
- Database encryption strategy
- IPC security enforcement
- Network security controls
- Input validation requirements
- Audit logging security
- Secure update and distribution mechanism
- Security testing requirements
- Incident response boundaries

### 2.2 Out of scope

The following are not defined here:

- Team synchronization security (future)
- Multi-user authentication (future)
- Plugin sandboxing details (future, expansion layer)
- Browser automation security (future, expansion layer)
- Computer-use security model (future, expansion layer)
- Network threat detection or intrusion prevention
- Source code obfuscation or anti-reverse-engineering measures
- DDoS protection (not applicable to local-first desktop app)

---

## 3. Assumptions

**A1.** The user's machine is not already compromised at the OS level. Superious cannot defend against kernel-level malware, rootkits, or attacks that have already compromised the OS credential vault.

**A2.** The Windows Credential Manager (Phase 1) is functioning and accessible. The app cannot operate if the OS keyring is unavailable or locked.

**A3.** Tauri v2's security model (IPC allowlist, CSP, process isolation) works as documented and is not compromised by bugs in Tauri itself.

**A4.** SQLCipher's encryption is cryptographically sound and not compromised. The app relies on SQLCipher's implementation of AES-256-CBC for at-rest encryption.

**A5.** External provider APIs (OpenAI, Anthropic, search providers) implement standard TLS 1.2+ and do not leak credentials or responses to unauthorized parties.

**A6.** The Rust and TypeScript dependency ecosystems are secure. Dependencies are vetted through `cargo audit` and `npm audit` before release.

**A7.** GitHub Actions build infrastructure is secure. Code signing keys are protected by GitHub Secrets and not exposed in build logs.

**A8.** Users do not intentionally bypass security controls (e.g., manually editing the database file, modifying the executable, disabling OS security features).

---

## 4. Requirements

### 4.1 Security requirements

**SR-01.** The application must never expose API keys, database encryption keys, or provider tokens in the renderer process, IPC payloads, log files, error messages, or developer tools.

**SR-02.** The local database must be encrypted at rest using SQLCipher with AES-256. The database must not be readable as plaintext by any standard SQLite client.

**SR-03.** All API keys and the database encryption key must be stored exclusively in the OS-native credential vault. They must never be written to disk in plaintext, even temporarily.

**SR-04.** All IPC commands exposed to the renderer must validate inputs before execution. Invalid inputs must return typed errors without producing partial side effects or panicking.

**SR-05.** Outgoing network requests must be restricted to explicitly approved provider domains. The Tauri CSP allowlist is the enforcement mechanism.

**SR-06.** The frontend must not be capable of triggering shell commands, arbitrary filesystem writes outside the app data directory, or subprocess execution.

**SR-07.** All security-sensitive actions (provider calls, key changes, export events, database modifications) must be recorded in the audit log with timestamp, actor, and context.

**SR-08.** On crash recovery, the application must not automatically re-execute the last incomplete action. Recovery restores UI state only.

**SR-09.** The application must perform no network calls, database writes, or AI generation while in the background or after the user has closed the active session, unless explicitly enabled by the user in a future scheduled task feature.

**SR-10.** HTML content retrieved from external sources must be sanitized before storage or rendering to prevent XSS attacks in the report viewer.

**SR-11.** The application executable must be code-signed before distribution. Unsigned builds must not be released to users.

**SR-12.** The application must verify the integrity of provider responses before storing them. Malformed or unexpectedly large responses must be rejected.

---

## 5. Architecture and Design Details

### 5.1 Threat model

#### 5.1.1 Threat actors

**TA-01: Malicious external provider**  
A compromised or malicious AI/search provider attempts to inject malicious content, steal credentials, or cause denial of service.

**TA-02: Malicious website content**  
Retrieved web page content contains XSS payloads, malicious scripts, or oversized content designed to crash the app or corrupt the database.

**TA-03: Local attacker with user-level access**  
An attacker with access to the user's machine (but not admin/root) attempts to extract API keys, database contents, or session data from the app.

**TA-04: Network attacker (MITM)**  
An attacker intercepts network traffic between the app and external providers to steal credentials or modify responses.

**TA-05: Supply chain compromise**  
A compromised dependency in the Rust or TypeScript ecosystem introduces malicious code into the app.

**TA-06: Malicious update**  
An attacker distributes a fake or compromised version of the app update to users.

#### 5.1.2 Attack vectors

| Vector | Threat actor | Mitigation |
|--------|--------------|------------|
| **AV-01: API key extraction from memory** | TA-03 | Keys held in memory only during active use in Rust backend. Not transmitted to renderer. Memory is not swapped to disk (OS-dependent). |
| **AV-02: API key extraction from disk** | TA-03 | Keys stored only in OS keyring. No plaintext files. Database encrypted. |
| **AV-03: Database file theft** | TA-03 | SQLCipher encryption with key in OS keyring. Database unreadable without key. |
| **AV-04: IPC command injection** | TA-03 | All IPC commands have typed inputs. Validation in Rust before execution. Tauri allowlist enforces callable commands. |
| **AV-05: XSS in report viewer** | TA-01, TA-02 | HTML sanitization on all retrieved content before storage and rendering. |
| **AV-06: Network traffic interception** | TA-04 | TLS 1.2+ enforced for all provider calls. Certificate validation required. |
| **AV-07: Malicious provider response** | TA-01 | Response size limits. Schema validation. Content sanitization before storage. |
| **AV-08: Oversized response (DoS)** | TA-01, TA-02 | Maximum response size enforced (TBD, see Open Questions). Streaming responses have chunk size limits. |
| **AV-09: Dependency compromise** | TA-05 | `cargo audit` and `npm audit` in CI. Dependency lock files committed. Regular dependency updates with review. |
| **AV-10: Fake update distribution** | TA-06 | Code signing with certificate. Update signature verification before installation. |
| **AV-11: Filesystem traversal** | TA-03 | All filesystem operations validate paths against allowed directories. No user-supplied paths accepted without validation. |
| **AV-12: Log injection** | TA-03 | Structured logging with no user input in format strings. Sensitive fields excluded at all log levels. |

#### 5.1.3 Assets to protect

| Asset | Confidentiality | Integrity | Availability |
|-------|-----------------|-----------|--------------|
| API keys | Critical | Critical | High |
| Database encryption key | Critical | Critical | High |
| Research session data | High | High | Medium |
| Retrieved source content | Medium | High | Medium |
| User prompts and AI responses | High | High | Medium |
| Audit logs | Medium | Critical | Medium |
| Application executable | Low | Critical | High |

### 5.2 Security boundaries

#### 5.2.1 Process boundary: Main ↔ Renderer

**Enforcement mechanism:** Tauri v2 IPC with allowlist.

**Rules:**
- No API key or database encryption key crosses this boundary in any direction.
- All sensitive operations (database access, keyring access, network calls) execute in the main process only.
- The renderer invokes operations via typed IPC commands. The main process validates all inputs before acting.
- Events from main to renderer carry only sanitized, non-sensitive data.

**Validation:**
- Security audit confirms no key material in IPC payloads or event emissions.
- Runtime inspection with Tauri devtools confirms no secrets in renderer memory.

#### 5.2.2 Application boundary: App ↔ OS

**Enforcement mechanism:** OS-native APIs and Tauri configuration.

**Rules:**
- Keyring access is mediated by the OS credential vault API.
- Filesystem access is restricted to designated directories via Tauri allowlist.
- Network access is restricted to approved domains via Tauri CSP.

**Validation:**
- Verify Tauri allowlist blocks filesystem operations outside allowed directories.
- Verify Tauri CSP blocks network requests to non-approved domains.
- Verify keyring API returns errors when unavailable, not fallback to plaintext.

#### 5.2.3 Network boundary: App ↔ External providers

**Enforcement mechanism:** TLS 1.2+, certificate validation, domain allowlist.

**Rules:**
- All provider calls use HTTPS with certificate validation.
- Provider domains are explicitly allowlisted in Tauri configuration.
- No user-supplied URLs are called directly. URLs are validated against allowed patterns before use.
- Provider responses are validated for schema compliance and size limits before storage.

**Validation:**
- Confirm TLS 1.2+ is negotiated for all provider calls.
- Confirm certificate validation failures abort the request.
- Confirm oversized responses are rejected.

### 5.3 Cryptographic strategy

#### 5.3.1 Database encryption

**Algorithm:** AES-256-CBC (SQLCipher default)  
**Key size:** 256 bits  
**Key derivation:** PBKDF2 with SHA-256 (SQLCipher default, 256,000 iterations)

**Implementation:**
- SQLCipher handles encryption transparently at the SQLite page level.
- The encryption key is loaded from the OS keyring at startup.
- The key is set via `PRAGMA key='...'` immediately after opening the connection.
- The key is held in memory in the Rust backend for the application session.
- On application exit, the key is cleared from memory (Rust `zeroize` crate).

**Key generation:**
- On first run, generate a 256-bit random key using `rand::rngs::OsRng`.
- Store the key in the OS keyring under the service name `com.superious.app` with key identifier `db_encryption_key`.
- The key is never changed after initial generation in v1.

**Verification:**
- Confirm the database file is unreadable by `sqlite3` CLI without the key.
- Confirm `PRAGMA cipher_version` returns a valid SQLCipher version.

#### 5.3.2 Key storage

**Mechanism:** OS-native credential vault  
**Windows (Phase 1):** Windows Credential Manager via `keyring` crate  
**Future (Phase 2):** macOS Keychain, Linux Secret Service

**Implementation:**
- API keys and the database encryption key are stored as credential entries.
- Service name: `com.superious.app`
- Key identifiers: `db_encryption_key`, `openai_api_key`, `brave_search_key`, etc.
- Keys are written once during settings configuration.
- Keys are read on demand and not cached in memory longer than the duration of a single operation.

**Error handling:**
- If the keyring is unavailable at startup, the app displays an error dialog and exits.
- If a key is missing when needed, the operation fails with a clear error message.
- If a key write fails, the error is surfaced immediately in the settings UI.

**Crate selection:**
- **Preferred:** `keyring` crate (https://crates.io/crates/keyring)
- **Verification required:** Compatibility with Tauri v2, Windows Credential Manager support, error behavior when keyring is locked/unavailable.
- **Alternative:** Direct Windows API access via `windows-rs` if `keyring` proves incompatible.

#### 5.3.3 TLS configuration

**Minimum version:** TLS 1.2  
**Preferred version:** TLS 1.3  
**Certificate validation:** Required, no self-signed certificates accepted

**Implementation:**
- The Rust `reqwest` client enforces TLS by default.
- No custom certificate trust stores are configured in v1.
- Certificate validation failures abort the request and surface an error.

**Verification:**
- Confirm `reqwest` rejects connections with invalid certificates.
- Confirm TLS version negotiation succeeds with approved providers.

#### 5.3.4 No custom cryptography

**Rule:** The application does not implement custom cryptographic primitives. All cryptography is delegated to well-vetted libraries:
- SQLCipher for database encryption
- OS keyring APIs for key storage
- `reqwest` (via `rustls` or `native-tls`) for TLS
- `rand` crate with `OsRng` for random number generation

### 5.4 Secrets management

#### 5.4.1 API key lifecycle

**Storage:**
1. User enters API key in settings UI.
2. Frontend sends `add_provider_key` IPC command with provider name (no key in payload yet).
3. Main process prompts for the key via a secure input dialog (Tauri native dialog or OS-level secure input).
4. Main process writes the key to the OS keyring.
5. Main process confirms success to the frontend (no key echoed back).

**Retrieval:**
1. Main process receives an IPC command requiring a provider call (e.g., `generate_report`).
2. Main process reads the key from the OS keyring.
3. Main process constructs the provider request with the key in the HTTP header.
4. Main process makes the call and streams the response.
5. Key is cleared from memory after the call completes (or if the call fails).

**Deletion:**
1. User deletes a provider in settings UI.
2. Frontend sends `remove_provider_key` IPC command with provider name.
3. Main process deletes the key from the OS keyring.
4. Main process confirms success to the frontend.

**Key rotation:**
- Not supported in v1. If a key is compromised, the user deletes the old key and adds a new one.

#### 5.4.2 Database encryption key lifecycle

**Generation:**
1. On first run, check if `db_encryption_key` exists in the OS keyring.
2. If not found, generate a 256-bit random key using `rand::rngs::OsRng`.
3. Write the key to the keyring under `db_encryption_key`.
4. Use the key to open/create the database.

**Retrieval:**
1. On every startup, read `db_encryption_key` from the keyring.
2. Set the key via `PRAGMA key='...'` immediately after opening the database connection.
3. Key is held in memory for the application session.
4. On exit, the key is cleared from memory using the `zeroize` crate.

**Key loss scenario:**
- If the keyring is wiped or the key is lost, the database is permanently unrecoverable.
- No backup or recovery mechanism in v1.
- Users must be warned during initial setup that key loss means data loss.

#### 5.4.3 Memory handling

**Sensitive data in memory:**
- API keys
- Database encryption key
- User prompts (may contain sensitive queries)
- AI responses (may contain sensitive content)

**Mitigation:**
- Keys are held in memory only during active operations.
- Keys are stored in `Vec<u8>` or `String` types that are cleared with `zeroize` after use.
- Rust's ownership model prevents accidental key duplication.
- No logging or debug output includes key material (enforced by structured logging filters).

**Limitation:**
- Rust cannot prevent the OS from swapping memory to disk. This is acceptable for v1 given the threat model (no defense against OS-level compromise).
- Future versions may explore `mlock` on platforms that support it.

### 5.5 Input validation

#### 5.5.1 IPC command validation

**Pattern:**
All IPC commands follow this validation flow:

```rust
#[tauri::command]
async fn command_name(
    session_id: String,
    user_input: String,
    state: tauri::State<'_, AppState>,
) -> Result<ResponseType, AppError> {
    // Step 1: Validate session_id exists
    let session = state.db.get_session(&session_id)
        .map_err(|_| AppError::SessionNotFound)?;
    
    // Step 2: Validate user_input (sanitize, length check, pattern check)
    validate_user_input(&user_input)?;
    
    // Step 3: Perform the operation
    let result = perform_operation(&session, &user_input).await?;
    
    // Step 4: Return sanitized result
    Ok(sanitize_response(result))
}
```

**Validation rules:**

| Input type | Validation |
|------------|------------|
| Session ID | Must be a valid UUID or integer. Must exist in the database. |
| URL | Must match `https://` scheme. Must not be in a blocked domain list. Length < 2048 characters. |
| Model name | Must match an allowlist of supported models (e.g., `gpt-4`, `claude-3-opus`). |
| Provider name | Must match an allowlist of supported providers (e.g., `openai`, `brave_search`). |
| User text (topic, query) | Length < 10,000 characters. No null bytes. Sanitize HTML if stored for later display. |
| File path (export) | Must be within the user-selected export directory. No `..` traversal. |

**Error handling:**
- Invalid inputs return a typed `AppError::ValidationError` with a user-friendly message.
- Validation failures are logged to the audit log.
- No partial side effects occur if validation fails.

#### 5.5.2 Provider response validation

**Pattern:**
All provider responses are validated before storage:

```rust
async fn handle_provider_response(
    response: ProviderResponse,
) -> Result<ValidatedResponse, AppError> {
    // Step 1: Check size
    if response.body.len() > MAX_RESPONSE_SIZE {
        return Err(AppError::ResponseTooLarge);
    }
    
    // Step 2: Validate schema
    let parsed = serde_json::from_str::<ExpectedSchema>(&response.body)
        .map_err(|_| AppError::InvalidResponseSchema)?;
    
    // Step 3: Sanitize HTML content
    let sanitized = sanitize_html(&parsed.content)?;
    
    // Step 4: Return validated response
    Ok(ValidatedResponse { content: sanitized, ... })
}
```

**Validation rules:**

| Response field | Validation |
|----------------|------------|
| HTTP status | Must be 2xx. Non-2xx responses are errors. |
| Content-Type | Must match expected type (e.g., `application/json` for AI responses). |
| Content-Length | Must be ≤ MAX_RESPONSE_SIZE (TBD, see Open Questions). |
| JSON structure | Must match expected schema. Unknown fields are ignored. |
| HTML content | Must be sanitized with `ammonia` crate before storage or rendering. |

**MAX_RESPONSE_SIZE determination (TBD):**
- **Candidate values:** 10 MB (search results), 1 MB (AI responses), 100 KB (metadata calls)
- **Decision criteria:** Provider API limits, database performance, memory constraints
- **Resolution path:** Measure typical response sizes from approved providers, set limits with 2x headroom

### 5.6 Network security

#### 5.6.1 Domain allowlist

**Mechanism:** Tauri CSP configuration in `tauri.conf.json`.

**Approved domains for v1 (TBD, requires product decision):**

Example configuration:
```json
{
  "tauri": {
    "allowlist": {
      "http": {
        "scope": [
          "https://api.openai.com/*",
          "https://api.anthropic.com/*",
          "https://api.search.brave.com/*"
        ]
      }
    }
  }
}
```

**Enforcement:**
- Tauri blocks network requests to domains not in the allowlist.
- The allowlist is updated only when a new approved provider is added.
- User-supplied URLs are never called directly. URLs from search results are fetched through a validation layer that checks against a blocklist (if needed).

#### 5.6.2 TLS enforcement

**Configuration:**
```rust
let client = reqwest::Client::builder()
    .timeout(Duration::from_secs(30))
    .min_tls_version(reqwest::tls::Version::TLS_1_2)
    .https_only(true)
    .build()?;
```

**Validation:**
- Certificate validation is enabled by default in `reqwest`.
- Self-signed certificates are rejected.
- Certificate chain validation is performed.

#### 5.6.3 Rate limiting and abuse prevention

**v1 scope:**
- No client-side rate limiting. Providers enforce their own rate limits.
- If a provider returns a 429 (Too Many Requests) error, the app displays the error and does not retry automatically.
- Users must wait before retrying or switch to a different provider.

**Future scope:**
- Client-side rate limiting per provider to avoid hitting API limits.
- Exponential backoff on retries.

### 5.7 Data protection

#### 5.7.1 Data at rest

**Protected:**
- SQLite database: Encrypted with SQLCipher
- API keys: Stored in OS keyring only
- Cached page content: Stored in encrypted database

**Not protected:**
- Application logs: Stored in plaintext (but sanitized, no keys)
- Exported reports: Plaintext (user responsibility to protect)

**Rationale:**
- Logs do not contain sensitive secrets. They are stored locally and readable only by the user.
- Exported reports are user-facing documents. Encryption is the user's responsibility if needed.

#### 5.7.2 Data in transit

**Protected:**
- All provider API calls: TLS 1.2+
- No data is transmitted to other machines in v1 (local-first)

#### 5.7.3 Data retention

**Session data:**
- Retained indefinitely until explicitly deleted by the user.
- Archived sessions are hidden but not deleted.
- No automatic expiration in v1.

**Audit logs:**
- Retained indefinitely.
- No automatic pruning in v1.

**Cache:**
- Cached page content is retained until manually cleared by the user.

**Future scope:**
- Configurable retention policies for sessions and logs.
- Automatic pruning of old sessions or cache entries.

### 5.8 Audit and logging

#### 5.8.1 Audit log

**Purpose:** Record security-sensitive actions for transparency and incident investigation.

**Logged events:**

| Event type | Fields |
|------------|--------|
| `provider_call` | `timestamp`, `provider`, `model`, `session_id`, `success`, `error_code` |
| `key_added` | `timestamp`, `provider`, `actor` |
| `key_removed` | `timestamp`, `provider`, `actor` |
| `session_exported` | `timestamp`, `session_id`, `export_path`, `actor` |
| `settings_changed` | `timestamp`, `setting_name`, `actor` |
| `database_opened` | `timestamp`, `success` |
| `keyring_accessed` | `timestamp`, `operation`, `success` |

**Storage:**
- Audit events are stored in the SQLite database in an `audit_event` table.
- The table is append-only from the app's perspective (no updates or deletes).

**Schema (conceptual):**
```sql
CREATE TABLE audit_event (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,
    actor TEXT,
    target_id TEXT,
    target_type TEXT,
    occurred_at INTEGER NOT NULL,
    metadata TEXT,
    success BOOLEAN NOT NULL
);
CREATE INDEX idx_audit_occurred_at ON audit_event(occurred_at);
CREATE INDEX idx_audit_event_type ON audit_event(event_type);
```

**Access:**
- Users can view the audit log via a settings UI panel.
- The log is queryable by date range, event type, and success status.

#### 5.8.2 Application logs

**Purpose:** Debug issues and monitor application health.

**Implementation:**
- Rust uses the `tracing` crate for structured logging.
- Logs are written to `%APPDATA%\Superious\logs\app.log` on Windows.
- Log rotation: daily, max 10 files, 10 MB per file.

**Log levels:**
- `ERROR`: Unrecoverable errors (database corruption, keyring unavailable)
- `WARN`: Recoverable errors (provider timeout, search failure)
- `INFO`: State changes (session created, search completed)
- `DEBUG`: Detailed flow (IPC commands, provider calls)
- `TRACE`: Very detailed flow (not enabled in production builds)

**Sensitive data exclusion:**
- API keys, tokens, raw provider payloads are never logged.
- User prompts and AI responses are logged only as metadata (length, timestamp) unless explicitly enabled by the user for debugging.
- Structured logging filters ensure no sensitive fields are included in log output.

**Sanitization:**
```rust
// Example: Log a provider call without exposing the key
tracing::info!(
    provider = %provider_name,
    model = %model_name,
    session_id = %session_id,
    "Provider call initiated"
);
// Never: tracing::info!("Provider call with key: {}", api_key);
```

### 5.9 Access control

#### 5.9.1 User model

**v1 scope:**
- Single-user desktop app. No multi-user authentication.
- Access control is enforced by the OS (user account access to the app data directory and keyring).

**Future scope:**
- Team synchronization may introduce user identity and access control lists.
- Not implemented in v1.

#### 5.9.2 Filesystem access

**Allowed directories:**
- **App data directory:** `%APPDATA%\Superious` (Windows), `~/.config/superious` (Linux), `~/Library/Application Support/Superious` (macOS)
- **Temp directory:** OS temp directory for transient operations
- **Export directory:** User-selected via Tauri file dialog

**Restrictions:**
- No IPC command accepts arbitrary file paths from the frontend.
- All file operations validate paths against allowed directories before executing.
- No `..` traversal is permitted.
- Symlink following is disabled (TBD: verify Rust `std::fs` behavior, may require explicit check).

**Validation:**
```rust
fn validate_export_path(path: &Path, allowed_dir: &Path) -> Result<(), AppError> {
    let canonical = path.canonicalize()
        .map_err(|_| AppError::InvalidPath)?;
    
    if !canonical.starts_with(allowed_dir) {
        return Err(AppError::PathTraversalAttempt);
    }
    
    Ok(())
}
```

### 5.10 Secure update mechanism

#### 5.10.1 Code signing

**Requirement:** All production builds must be code-signed before distribution.

**Windows (Phase 1):**
- Executable is signed with an Authenticode certificate.
- Certificate is stored in GitHub Secrets for CI/CD signing.
- Signing is performed via `signtool.exe` in the GitHub Actions workflow.

**Verification:**
- Windows SmartScreen does not block the executable on first run.
- Right-click → Properties → Digital Signatures shows a valid signature.

**Future (Phase 2):**
- macOS: Sign with Apple Developer ID certificate, notarize the app.
- Linux: Sign with GPG key, distribute checksum file signed with the key.

#### 5.10.2 Update distribution

**v1 scope:**
- Manual download from a trusted distribution channel (TBD: GitHub Releases, internal server).
- No automatic update mechanism in v1.

**Future scope:**
- Automatic update checking with signature verification.
- Tauri's update mechanism (`tauri-plugin-updater`) with public key verification.

**Integrity verification:**
- Distribute SHA-256 checksum alongside the executable.
- Users manually verify the checksum before installation (documented in user guide).

**Future:**
- Automatic checksum verification during update installation.

### 5.11 Dependency security

#### 5.11.1 Rust dependencies

**Audit:**
- Run `cargo audit` in CI on every commit.
- Fail the build if high or critical vulnerabilities are found.
- Review moderate vulnerabilities manually; defer or fix before release.

**Dependency pinning:**
- `Cargo.lock` is committed to the repository.
- Dependencies are updated intentionally, not automatically.

**Dependency review:**
- New dependencies require approval before adding.
- Prefer dependencies with:
  - Active maintenance (commits in last 6 months)
  - High crate.io download counts
  - Clear security policies
  - No known critical vulnerabilities

#### 5.11.2 TypeScript dependencies

**Audit:**
- Run `npm audit` in CI on every commit.
- Fail the build if high or critical vulnerabilities are found in production dependencies.
- Ignore dev-only vulnerabilities in v1 (they do not affect the production build).

**Dependency pinning:**
- `package-lock.json` is committed to the repository.

**Dependency review:**
- Same criteria as Rust dependencies.

#### 5.11.3 Supply chain attack mitigation

**GitHub Actions:**
- Pin actions to specific commit hashes, not `@latest` tags.
- Review action source code before use.
- Use official GitHub-maintained actions where possible.

**Crate.io / npm:**
- No custom registry mirrors in v1. Use official crates.io and npmjs.org.
- No unverified or unpublished dependencies.

### 5.12 Incident response

#### 5.12.1 Security incident definition

A security incident occurs when:
- A vulnerability is discovered in the application code or dependencies.
- A key or credential is exposed or leaked.
- The database or keyring is compromised.
- An external provider is compromised and returns malicious content.

#### 5.12.2 Response process

**Step 1: Assess severity**
- Critical: Key exposure, database compromise, RCE vulnerability
- High: XSS vulnerability, provider response validation bypass
- Medium: Dependency vulnerability with no active exploit
- Low: Minor information disclosure

**Step 2: Contain**
- For critical/high: Release emergency patch within 24 hours.
- For medium: Release patch in next scheduled release.
- For low: Document in release notes, fix in next release.

**Step 3: Notify**
- For critical/high: Notify all users via email or in-app notification.
- For medium/low: Document in release notes and changelog.

**Step 4: Remediate**
- Fix the vulnerability.
- Update dependencies if applicable.
- Add test cases to prevent regression.

**Step 5: Post-incident review**
- Document the incident in the ADR log.
- Update this Security Design Document if the threat model changes.

---

## 6. Security Considerations

This section is the core of the document and is already embedded in §5. This section summarizes key security principles:

**Defense in depth:** Multiple layers of protection (process isolation, IPC validation, encryption, allowlists).

**Least privilege:** Frontend has minimal privileges. All sensitive operations mediated by the backend.

**Fail securely:** Errors do not expose sensitive data or leave the system in an insecure state.

**Auditability:** All security-relevant actions are logged for transparency.

**No secret fallbacks:** If keyring or encryption fails, the app fails securely rather than falling back to plaintext.

**Cryptographic best practices:** No custom crypto. Delegate to vetted libraries.

---

## 7. Data Model and Contracts

### 7.1 Security-relevant database schema

**audit_event table:**
```sql
CREATE TABLE audit_event (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,
    actor TEXT,
    target_id TEXT,
    target_type TEXT,
    occurred_at INTEGER NOT NULL,
    metadata TEXT,
    success BOOLEAN NOT NULL
);
```

**provider_setting table:**
```sql
CREATE TABLE provider_setting (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider_type TEXT NOT NULL,  -- 'ai' or 'search'
    provider_name TEXT NOT NULL,
    model_name TEXT,
    key_stored_in_keyring BOOLEAN NOT NULL DEFAULT TRUE,
    created_at INTEGER NOT NULL
);
```

**Note:** API keys are NOT stored in this table. The `key_stored_in_keyring` field is a boolean flag indicating that the key exists in the OS keyring.

### 7.2 IPC security contracts

**Command validation contract:**
- All commands accept typed inputs (Rust structs).
- All commands return `Result<T, AppError>`.
- All commands validate inputs before execution.
- No command exposes sensitive data in the response.

**Event emission contract:**
- All events carry JSON-serializable payloads.
- No event payload contains API keys or raw provider credentials.
- Events include only sanitized, user-facing data.

### 7.3 Provider security contracts

**AI provider contract:**
- Provider implementations must use TLS for all requests.
- Provider implementations must validate responses before returning them.
- Provider implementations must not log API keys.

**Search provider contract:**
- Same as AI provider contract.
- Additionally: must sanitize HTML content from search results.

---

## 8. Failure Modes

### 8.1 Security failure scenarios

| Failure | Impact | Response |
|---------|--------|----------|
| **Keyring unavailable at startup** | App cannot access API keys or database encryption key. | Display error dialog, exit app. Do not fall back to plaintext storage. |
| **API key not found in keyring** | Provider call fails. | Display error in UI, log to audit log. Direct user to add key in settings. |
| **Database decryption fails** | Cannot open the database. | Display error dialog, exit app. Offer recovery path: restore from backup or reset database (data loss). |
| **TLS certificate validation fails** | Provider call fails. | Display error in UI, log to audit log. Do not bypass certificate validation. |
| **Oversized provider response** | Potential DoS or memory exhaustion. | Reject the response, log error, display error in UI. Session remains intact. |
| **XSS payload in search result** | Potential script execution in report viewer. | Sanitize HTML before storage and rendering. If sanitization fails, discard the content and log the incident. |
| **IPC command with invalid input** | Potential injection or unexpected behavior. | Return validation error, log to audit log, no side effects. |
| **Code signature verification fails** | User may be installing a compromised update. | (Future) Block installation, display warning. (v1) User manually verifies checksum. |
| **Dependency vulnerability discovered** | Potential exploit in production builds. | Release emergency patch if critical, regular patch otherwise. Notify users. |

### 8.2 Attack scenario walkthroughs

**Scenario 1: Local attacker attempts to extract API keys**

1. Attacker gains user-level access to the machine.
2. Attacker attempts to read the database file → blocked by SQLCipher encryption.
3. Attacker attempts to read the keyring → blocked by OS credential vault (requires user authentication).
4. Attacker attempts to inspect app memory → keys are held only during active operations, not persisted.
5. Attacker attempts to intercept IPC messages → no keys in IPC payloads.
6. **Result:** Attack fails unless attacker escalates to OS-level compromise.

**Scenario 2: Malicious provider returns XSS payload**

1. User submits a search query.
2. Search provider returns a result with `<script>alert('XSS')</script>` in the page title.
3. App retrieves the page content.
4. Content sanitization layer (§5.5.2) strips the `<script>` tag using `ammonia` crate.
5. Sanitized content is stored in the database.
6. Report viewer renders the content → no script execution.
7. **Result:** Attack blocked by HTML sanitization.

**Scenario 3: Attacker distributes fake update**

1. Attacker creates a fake version of the app and distributes it via a phishing email.
2. User downloads the fake update.
3. (v1) User manually verifies the checksum → mismatch detected, installation aborted.
4. (Future) Automatic signature verification fails, installation blocked.
5. **Result:** Attack blocked by code signing and checksum verification.

---

## 9. Open Questions

| ID | Question | Impact | Resolution path |
|----|----------|--------|-----------------|
| OQ-S01 | What is the maximum response size (MAX_RESPONSE_SIZE) for AI and search provider responses? | Affects DoS protection (§5.5.2) | Measure typical response sizes from approved providers, set limits with 2x headroom. |
| OQ-S02 | Does the `keyring` crate support Windows Credential Manager on Windows 10/11? Is it compatible with Tauri v2? | Affects keyring integration (§5.3.2) | Test `keyring` crate in a Tauri prototype. Review crate issues for known Windows incompatibilities. |
| OQ-S03 | Does Rust `std::fs` follow symlinks by default? If so, how do we disable symlink following for path validation? | Affects filesystem access control (§5.9.2) | Review Rust `std::fs` documentation. Test symlink behavior. Implement explicit symlink detection if needed. |
| OQ-S04 | What HTML sanitization library is used? `ammonia` vs `bleach` (Python) vs custom? | Affects XSS protection (§5.5.2) | Evaluate `ammonia` crate for Rust. Confirm it supports the required HTML subset for report rendering. |
| OQ-S05 | Which specific providers are approved for v1 (AI and search)? This determines the domain allowlist. | Affects network security (§5.6.1) | Requires product decision from PRD open questions OQ-01 and OQ-02. |
| OQ-S06 | What is the code signing certificate acquisition process? Who holds the private key? | Affects secure update mechanism (§5.10.1) | Work with infrastructure team to acquire certificate. Store private key in GitHub Secrets. |
| OQ-S07 | What is the checksum distribution mechanism for manual updates in v1? | Affects update integrity verification (§5.10.2) | Publish SHA-256 checksum alongside executable on GitHub Releases or internal server. Document verification process in user guide. |
| OQ-S08 | What is the retention policy for audit logs? Is there a maximum age or storage limit? | Affects data retention (§5.7.3) | Define in Data Model and Retention Doc. No automatic pruning in v1. |
| OQ-S09 | Does SQLCipher's default PBKDF2 iteration count (256,000) meet current security standards, or should it be increased? | Affects database encryption strength (§5.3.1) | Research current OWASP recommendations for PBKDF2 iterations. SQLCipher default is acceptable for v1; revisit for v2. |
| OQ-S10 | What is the process for revoking access if a user leaves the team? | Affects access control model | v1: Uninstall the app from their machine. Future: Implement remote access revocation via identity provider. |

---

## 10. Acceptance Criteria

The security model is validated when:

**AC-01 — No secrets in renderer.** A security audit confirms no API key, database encryption key, or provider token appears in the renderer process memory, IPC payloads, event emissions, or developer tools at any point during normal operation.

**AC-02 — Database encryption works.** A raw database file on disk is unreadable by `sqlite3` CLI without the correct key. Verified by manual inspection and automated test.

**AC-03 — Keyring integration works.** API keys written to the OS keyring are retrieved successfully on next launch. Keyring unavailability produces a clear error and exits the app without falling back to plaintext storage.

**AC-04 — IPC validation blocks invalid inputs.** Automated tests confirm that all IPC commands reject invalid inputs (wrong types, missing fields, out-of-range values) without producing side effects.

**AC-05 — HTML sanitization prevents XSS.** Automated tests confirm that `<script>`, `<iframe>`, `onclick=`, and other XSS vectors are stripped from search results and AI responses before storage and rendering.

**AC-06 — TLS enforcement works.** Automated tests confirm that provider calls negotiate TLS 1.2+ and reject invalid certificates. No plaintext HTTP requests are made.

**AC-07 — Domain allowlist blocks unauthorized requests.** Automated tests confirm that network requests to domains outside the allowlist fail at the Tauri layer.

**AC-08 — Oversized responses are rejected.** Automated tests confirm that responses exceeding MAX_RESPONSE_SIZE are rejected without crashing the app or corrupting the session.

**AC-09 — Audit log is complete.** Manual inspection confirms that all provider calls, key changes, export events, and database modifications appear in the audit log with correct timestamps and context.

**AC-10 — Dependency audit passes.** `cargo audit` and `npm audit` pass with no high or critical vulnerabilities in production dependencies.

**AC-11 — Code signing is valid.** The production executable is signed with a valid Authenticode certificate. Windows SmartScreen does not block the app. Signature is verifiable via Windows properties dialog.

**AC-12 — Crash recovery is secure.** After a simulated crash mid-generation, the next launch restores the session state without re-executing the interrupted action. No secrets are exposed in the recovery process.

**AC-13 — Path traversal is blocked.** Automated tests confirm that file operations reject paths containing `..` or paths outside allowed directories.

**AC-14 — Memory is cleared on exit.** Inspection with a memory debugger confirms that API keys and the database encryption key are cleared from memory using `zeroize` on normal exit. (Best-effort; OS may swap memory to disk.)

**AC-15 — Attack scenarios are tested.** All attack scenarios in §8.2 are tested and produce the documented behavior.