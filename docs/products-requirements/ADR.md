# Superious — Architecture Decision Records (ADR)

**Version:** 0.1 — Draft
**Status:** Pre-implementation
**Depends on:** Foundation Spec, PRD, Security Design Document, System Architecture Document
**Feeds into:** Component specs, implementation planning, Test Strategy, Release and Deployment Doc

---

# 1. Purpose

This document records the major architectural decisions for Superious v1.0 and the rationale behind them.

The ADR set exists to:

* preserve architectural intent over time
* prevent undocumented divergence from security and system constraints
* define stable technical boundaries before implementation
* support future expansion without breaking the MVP foundation
* create an auditable record for future changes

Each ADR includes:

* decision
* context
* alternatives considered
* consequences
* implementation constraints
* unresolved questions where applicable

This document is authoritative for architectural direction unless superseded by a later approved ADR.

---

# 2. Scope

This ADR document covers foundational decisions for:

* desktop application architecture
* frontend/backend trust boundaries
* IPC communication
* provider abstraction
* persistence and encryption
* secrets management
* streaming architecture
* extensibility constraints
* security enforcement points
* network isolation
* logging and audit boundaries
* future capability compatibility

This document does not define:

* detailed UI implementation
* detailed database schema
* provider-specific APIs
* test procedures
* deployment pipelines
* plugin implementation details
* browser/computer-use implementation details

---

# 3. Assumptions

**A1.** Superious remains a local-first, private desktop application in v1.

**A2.** Tauri v2 remains the application shell and IPC framework.

**A3.** Rust remains the trusted execution environment for sensitive operations.

**A4.** TypeScript + React + Vite remain the renderer stack.

**A5.** SQLite + SQLCipher remain the only database system for v1.

**A6.** The OS-native credential vault is available and operational.

**A7.** Vercel AI SDK remains compatible with the intended provider orchestration model.

**A8.** Future expansion features must integrate through adapter and provider boundaries rather than direct core coupling.

---

# 4. Requirements

The ADR set must satisfy the following requirements:

| ID     | Requirement                                                                     |
| ------ | ------------------------------------------------------------------------------- |
| ADR-01 | Architectural decisions must preserve strict frontend/backend trust separation. |
| ADR-02 | Decisions must support future provider replacement without core rewrites.       |
| ADR-03 | Decisions must preserve local-first behavior.                                   |
| ADR-04 | Decisions must not require exposing secrets to the renderer process.            |
| ADR-05 | Decisions must support future expansion modules through stable interfaces.      |
| ADR-06 | Decisions must align with the Security Design Document.                         |
| ADR-07 | Decisions must support auditability and reproducibility of research outputs.    |
| ADR-08 | Decisions must avoid introducing unnecessary operational complexity in v1.      |
| ADR-09 | Decisions must remain compatible with Windows-first deployment.                 |
| ADR-10 | Decisions must avoid speculative infrastructure not required by the MVP.        |

---

# 5. Architecture / Design Details

---

# ADR-001 — Adopt Tauri v2 as the Desktop Application Shell

## Status

Accepted

## Context

The application requires:

* native desktop packaging
* secure Rust backend execution
* controlled IPC
* low memory overhead
* Windows-first deployment
* future cross-platform capability

The system also requires strict trust separation between UI and sensitive operations.

## Decision

Use Tauri v2 as the desktop application framework.

The renderer uses:

* TypeScript
* React
* Vite

The trusted backend uses:

* Rust
* Tauri IPC commands
* Tauri event streaming

## Alternatives considered

### Electron

Rejected because:

* higher memory footprint
* larger bundle size
* weaker default trust separation
* broader attack surface

### Native Rust UI frameworks

Rejected because:

* weaker frontend ecosystem maturity
* slower iteration for complex UI workflows
* reduced compatibility with modern web UI tooling

## Consequences

### Positive

* Strong Rust integration
* Native IPC model
* Smaller runtime footprint
* Better security defaults
* Good future cross-platform support

### Negative

* Tauri ecosystem maturity still evolving
* Some plugin APIs may change between versions
* Additional verification needed for long-lived streaming flows

## Constraints

* No direct frontend filesystem access
* No direct frontend network provider calls containing secrets
* IPC commands must remain typed and allowlisted

---

# ADR-002 — Enforce Strict Trusted/Untrusted Process Separation

## Status

Accepted

## Context

The frontend cannot safely hold:

* API keys
* database encryption keys
* unrestricted filesystem access
* unrestricted network access

The project requires explicit trust boundaries.

## Decision

The Rust backend is the only trusted execution layer.

The renderer process is treated as untrusted.

Sensitive operations execute exclusively in Rust:

* database access
* provider credential handling
* outbound provider requests
* audit logging
* keyring access
* export operations

The frontend communicates only through typed IPC commands and backend events.

## Alternatives considered

### Shared secret access between frontend and backend

Rejected because it violates the security baseline.

### Direct provider calls from frontend

Rejected because API keys would become exposed to renderer memory and browser tooling.

## Consequences

### Positive

* Stronger security isolation
* Reduced credential exposure
* Better auditability
* Clear operational boundaries

### Negative

* More IPC coordination required
* Some frontend SDK integrations become more complex

## Constraints

* No secret material may cross the IPC boundary
* No fallback direct provider access from frontend

---

# ADR-003 — Use SQLite + SQLCipher for Local Persistence

## Status

Accepted

## Context

The application requires:

* local-first persistence
* offline session access
* encrypted storage
* crash recovery
* low operational overhead

No server infrastructure exists in v1.

## Decision

Use:

* SQLite
* SQLCipher

The database is accessed exclusively through Rust.

Encryption is applied at the database layer through SQLCipher.

## Alternatives considered

### PostgreSQL

Rejected because:

* unnecessary operational complexity
* requires background service management
* unsuitable for local-first single-user deployment

### IndexedDB or browser storage

Rejected because:

* weaker security control
* insufficient encryption guarantees
* poor schema migration ergonomics

## Consequences

### Positive

* Mature embedded database
* Strong portability
* Good transactional reliability
* Compatible with Tauri desktop deployment

### Negative

* Single-writer limitations
* Additional migration discipline required

## Constraints

* All schema changes require migrations
* WAL mode enabled for recovery and concurrency
* Renderer cannot access the database directly

---

# ADR-004 — Store Secrets Only in OS-Native Credential Storage

## Status

Accepted

## Context

The application handles:

* provider API keys
* database encryption keys

The PRD and Security Design Document prohibit plaintext secret storage.

## Decision

Store secrets only in OS-native secure credential storage.

Phase 1 target:

* Windows Credential Manager

Current preferred Rust integration:

* `keyring` crate

This requires compatibility verification against:

* Tauri v2
* Windows 10/11 credential APIs
* locked/unavailable credential vault behavior

## Alternatives considered

### Environment variables

Rejected because:

* weak desktop UX
* insecure operational patterns
* accidental exposure risk

### Local encrypted config file

Rejected because:

* introduces key bootstrapping problems
* weaker than OS-backed credential storage

## Consequences

### Positive

* OS-managed security model
* Reduced accidental exposure
* Better compatibility with desktop security expectations

### Negative

* Recovery complexity if keyring becomes unavailable
* Platform-specific behavior differences

## Constraints

* No plaintext secret persistence
* No frontend secret access
* Key loss means database loss in v1

---

# ADR-005 — Use Typed IPC Commands as the Sole Cross-Process Interface

## Status

Accepted

## Context

The application requires:

* controlled frontend/backend communication
* validation boundaries
* extensibility
* event streaming

## Decision

Use Tauri IPC commands and Tauri event emission exclusively for process communication.

IPC commands:

* must be explicitly registered
* must validate all inputs
* must return typed results

Streaming updates use backend-emitted events.

## Alternatives considered

### Local WebSocket server

Rejected because:

* unnecessary attack surface
* weaker security posture
* additional lifecycle complexity

### Shared memory or direct bindings

Rejected because:

* weaker isolation
* increased complexity
* reduced portability

## Consequences

### Positive

* Strong communication boundaries
* Easier auditing
* Better future extensibility

### Negative

* Serialization overhead
* Requires disciplined event contracts

## Constraints

* IPC schemas must remain versionable
* Event payloads must be sanitized
* Commands must remain allowlisted

---

# ADR-006 — Abstract AI Providers Behind a Stable Provider Layer

## Status

Accepted

## Context

The project requires:

* provider flexibility
* future local model support
* future multimodal support
* provider replacement without rewrites

## Decision

All AI providers must implement a shared provider interface.

Provider orchestration executes in Rust.

The provider abstraction includes:

* model metadata
* streaming support
* capability detection
* error normalization
* cancellation support

The frontend must not contain provider-specific logic outside presentation concerns.

## Alternatives considered

### Direct provider-specific integration throughout the app

Rejected because:

* creates vendor lock-in
* increases maintenance cost
* complicates future expansion

## Consequences

### Positive

* Easier provider replacement
* Cleaner future local model support
* Better testability

### Negative

* Additional abstraction complexity
* Requires normalized provider behaviors

## Constraints

* Providers must expose failure modes
* Providers must support cancellation
* Providers must expose capability metadata

---

# ADR-007 — Preserve Expansion Capability Through Adapter Boundaries

## Status

Accepted

## Context

Future capabilities include:

* plugins
* browser-use
* computer-use
* local models
* schedulers
* extensions
* remote connectors

The MVP must not hard-couple itself to future tooling.

## Decision

Future integrations enter only through:

* provider interfaces
* adapters
* extension boundaries
* plugin contracts

The core application must not directly depend on:

* automation engines
* browser frameworks
* third-party orchestration runtimes

## Alternatives considered

### Direct integration of future frameworks into core logic

Rejected because:

* creates architectural brittleness
* reduces replaceability
* increases upgrade risk

## Consequences

### Positive

* Better long-term maintainability
* Safer future integration
* Easier capability replacement

### Negative

* Requires stronger contract discipline
* More upfront architectural planning

## Constraints

* Future modules require documented contracts
* Permission boundaries remain centralized
* No module bypasses the core security model

---

# ADR-008 — Preserve Full Research Auditability

## Status

Accepted

## Context

The product requires:

* trustworthy research output
* citation traceability
* reproducibility
* evidence verification

## Decision

The system stores:

* prompts
* generated plans
* retrieved sources
* extracted claims
* citations
* AI outputs
* audit events

Generated claims must remain traceable to stored evidence.

## Alternatives considered

### Ephemeral generation without evidence persistence

Rejected because:

* incompatible with research verification goals
* prevents auditability

## Consequences

### Positive

* Better reproducibility
* Better debugging
* Stronger evidence traceability

### Negative

* Larger local storage footprint
* More schema coordination required

## Constraints

* Citation fabrication is prohibited
* Claims without evidence must be flagged
* Audit events must remain append-oriented

---

# 6. Security Considerations

All ADRs in this document inherit the constraints from the Security Design Document.

Additional ADR-specific security rules:

| ID         | Rule                                                                                          |
| ---------- | --------------------------------------------------------------------------------------------- |
| SEC-ADR-01 | No ADR may weaken the trusted/untrusted process boundary without a formal security review.    |
| SEC-ADR-02 | All future expansion features must preserve centralized permission enforcement.               |
| SEC-ADR-03 | Adapter modules must fail safely when unavailable.                                            |
| SEC-ADR-04 | Streaming architectures must not expose secrets in event payloads.                            |
| SEC-ADR-05 | Provider abstractions must normalize error handling to avoid leaking sensitive provider data. |
| SEC-ADR-06 | Future plugin systems must not gain unrestricted filesystem or network access.                |

---

# 7. Data Model / Contracts

The ADR set introduces the following architectural contract expectations.

## Provider contract requirements

All providers must define:

* provider name
* supported capabilities
* timeout behavior
* retry behavior
* streaming support
* cancellation behavior
* failure modes

## IPC contract requirements

All IPC commands must define:

* command name
* typed input schema
* typed output schema
* validation rules
* permission scope
* failure behavior

## Migration contract requirements

Database migrations must:

* be versioned
* be deterministic
* preserve existing user data
* execute automatically on startup

---

# 8. Failure Modes

| Failure                     | Expected behavior                                                  |
| --------------------------- | ------------------------------------------------------------------ |
| Keyring unavailable         | Application startup fails safely with user-visible error           |
| Database decryption failure | Application refuses database access and logs the event             |
| Provider unavailable        | Operation fails with typed provider error                          |
| IPC validation failure      | Command rejected with no side effects                              |
| Streaming interruption      | Partial generation preserved and marked incomplete                 |
| Migration failure           | Startup halted before partial schema application                   |
| Unsupported future adapter  | Adapter isolated and disabled without crashing core app            |
| Renderer crash              | Backend state preserved where possible; session recovery available |

---

# 9. Open Questions

| ID    | Question                                                                                                    |
| ----- | ----------------------------------------------------------------------------------------------------------- |
| OQ-01 | Which search providers are officially approved for v1?                                                      |
| OQ-02 | Which AI providers are officially approved for v1?                                                          |
| OQ-03 | Can the Vercel AI SDK cleanly support the preferred Rust-mediated streaming model?                          |
| OQ-04 | Is the `keyring` crate fully compatible with Tauri v2 and Windows Credential Manager behavior requirements? |
| OQ-05 | What response-size limits should be enforced for provider payloads?                                         |
| OQ-06 | Which export formats are mandatory for v1?                                                                  |
| OQ-07 | Which exact migration framework will be standardized (`sqlx`, `refinery`, or alternative)?                  |
| OQ-08 | What retention policy applies to audit logs and cached content in future releases?                          |

---

# 10. Acceptance Criteria

The ADR document is considered accepted when:

| ID    | Criteria                                                                                                       |
| ----- | -------------------------------------------------------------------------------------------------------------- |
| AC-01 | All major architectural boundaries are documented.                                                             |
| AC-02 | All decisions align with the PRD, Foundation Spec, Security Design Document, and System Architecture Document. |
| AC-03 | No ADR contradicts the local-first or security-first model.                                                    |
| AC-04 | Extensibility constraints are explicitly preserved.                                                            |
| AC-05 | Trust boundaries are formally defined.                                                                         |
| AC-06 | Provider abstraction requirements are documented.                                                              |
| AC-07 | Persistence and secrets-management decisions are documented.                                                   |
| AC-08 | Failure behavior is documented for all critical architectural areas.                                           |
| AC-09 | Open questions are isolated instead of guessed.                                                                |
| AC-10 | The document is implementation-aware without introducing unsupported speculation.                              |
