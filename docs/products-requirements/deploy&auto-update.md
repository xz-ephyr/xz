# Superious — Deployment and Auto-Update Specification

**Version:** 0.1 — Draft
**Status:** Pre-implementation
**Depends on:** Foundation Spec, PRD, System Architecture Document, Security Design Document, ADR Document
**Feeds into:** CI/CD configuration, Release and Deployment Doc, Runbook, Operational Procedures

---

# 1. Purpose

This document defines how Superious is:

* built
* packaged
* signed
* distributed
* updated
* verified
* recovered

It establishes the deployment architecture and auto-update behavior for v1.0 while preserving the project's:

* local-first model
* security boundaries
* trusted distribution requirements
* Windows-first deployment strategy

This document is authoritative for release packaging and update behavior.

---

# 2. Scope

## 2.1 In scope

This document defines:

* Windows desktop packaging
* Build artifact generation
* GitHub Actions release pipeline expectations
* Code signing requirements
* Tauri updater integration
* Update metadata generation
* Update verification rules
* Release channel strategy
* Update rollback behavior
* Installer expectations
* Local application directory structure
* Startup version checks
* Failure handling during updates
* Recovery expectations
* Artifact integrity requirements

## 2.2 Out of scope

The following are not defined here:

* Cloud synchronization deployment
* Linux packaging
* macOS notarization
* Enterprise fleet deployment
* Plugin marketplace distribution
* Multi-user licensing systems
* Telemetry systems
* Differential patching infrastructure beyond Tauri-supported behavior
* External package manager distribution
* Store distribution (Microsoft Store, Steam, etc.)

---

# 3. Assumptions

**A1.** Superious v1 targets Windows first.

**A2.** The application is distributed only to trusted internal users or approved team members.

**A3.** Tauri updater support remains stable and production-capable for Windows deployment.

**A4.** GitHub Actions remains the CI/CD system.

**A5.** Code-signing certificates are available before the first production release.

**A6.** Release artifacts are hosted through a secure HTTPS-accessible source compatible with Tauri updater requirements.

**A7.** The updater system must not require a separate always-running background service in v1.

**A8.** The updater must preserve local encrypted data and user settings during upgrades.

**A9.** The application does not support in-place downgrade compatibility guarantees unless explicitly stated for a release.

---

# 4. Requirements

## 4.1 Deployment requirements

| ID     | Requirement                                                                                                                  |
| ------ | ---------------------------------------------------------------------------------------------------------------------------- |
| DEP-01 | The application must build reproducible release artifacts through GitHub Actions.                                            |
| DEP-02 | Release artifacts must be code-signed before distribution.                                                                   |
| DEP-03 | Unsigned builds must never be distributed to production users.                                                               |
| DEP-04 | The installer must support standard Windows installation behavior.                                                           |
| DEP-05 | Installation must not require administrative privileges unless required by installer configuration or code-signing behavior. |
| DEP-06 | Application updates must preserve local database contents and OS keyring entries.                                            |
| DEP-07 | The updater must support integrity verification before installation.                                                         |
| DEP-08 | The updater must use HTTPS-only update endpoints.                                                                            |
| DEP-09 | The updater must not execute arbitrary remote code outside approved signed release artifacts.                                |
| DEP-10 | The deployment process must support rollback to a prior signed release artifact manually if necessary.                       |

---

## 4.2 Auto-update requirements

| ID    | Requirement                                                                                      |
| ----- | ------------------------------------------------------------------------------------------------ |
| AU-01 | The application must support manual update checks from the settings UI.                          |
| AU-02 | The application may perform startup update checks if enabled in settings. Default behavior: TBD. |
| AU-03 | The updater must verify artifact signatures before installation.                                 |
| AU-04 | The updater must present update status to the user.                                              |
| AU-05 | Update installation must require explicit user confirmation in v1.                               |
| AU-06 | Updates must not interrupt active research generation or export operations.                      |
| AU-07 | Failed updates must not corrupt existing installations or local databases.                       |
| AU-08 | The updater must support stable release channels. Additional channels are FUTURE.                |
| AU-09 | The updater must not bypass Tauri security boundaries or application signing requirements.       |
| AU-10 | The updater must fail safely if update metadata cannot be validated.                             |

---

## 4.3 CI/CD requirements

| ID    | Requirement                                                                                       |
| ----- | ------------------------------------------------------------------------------------------------- |
| CI-01 | Builds must execute in GitHub Actions.                                                            |
| CI-02 | Dependency lock files must be committed and respected during CI builds.                           |
| CI-03 | CI must fail on build, signing, or packaging errors.                                              |
| CI-04 | CI must support Rust and Node.js dependency installation.                                         |
| CI-05 | CI must perform security-oriented dependency auditing before release builds where practical.      |
| CI-06 | Release artifacts must include version metadata compatible with the updater system.               |
| CI-07 | CI must generate cryptographic signatures required by the updater.                                |
| CI-08 | Secrets used during signing must remain in GitHub Secrets or equivalent secure CI secret storage. |
| CI-09 | Release builds must be distinguishable from development builds.                                   |

---

# 5. Architecture / Design Details

---

# 5.1 Deployment model

Superious is deployed as a packaged desktop application using:

* Tauri v2
* Rust backend
* React/Vite frontend bundle

The deployment architecture is intentionally:

* local-first
* self-contained
* installer-based
* update-capable without requiring cloud synchronization infrastructure

The application package contains:

* Rust application binary
* frontend static bundle
* Tauri runtime assets
* updater metadata
* signed release metadata

No database contents or secrets are embedded into the installer.

---

# 5.2 Preferred packaging strategy

## Preferred approach

Use Tauri-supported Windows packaging through official Tauri build tooling.

Preferred package formats:

* MSI installer
* NSIS installer

Final selection: TBD after validating:

* update compatibility
* Windows SmartScreen behavior
* signing workflow stability
* silent update compatibility

## Reasoning

Tauri-native packaging:

* aligns with the existing stack
* avoids introducing external packaging systems
* preserves updater compatibility
* reduces operational complexity

---

# 5.3 Installer behavior

The installer must:

* install application binaries
* register uninstall metadata with Windows
* preserve user data during upgrades
* preserve application data directories
* avoid overwriting existing databases
* avoid touching OS credential vault entries

The installer must not:

* embed provider API keys
* embed environment-specific secrets
* install additional privileged services in v1

---

# 5.4 Local application directories

The application uses OS-standard application directories.

Expected categories:

| Category                     | Purpose                                 |
| ---------------------------- | --------------------------------------- |
| Application binary directory | Installed executable and runtime assets |
| App data directory           | Database, logs, cached research data    |
| Temporary directory          | Temporary export or update staging      |
| Log directory                | Structured application logs             |

Exact Windows paths:

* TBD
* Must follow Tauri and Windows conventions

The updater must not overwrite:

* local databases
* logs
* cache directories
* exported reports

---

# 5.5 Auto-update architecture

## Preferred approach

Use the built-in Tauri updater system.

## Reasoning

The Tauri updater:

* aligns with the application architecture
* supports signed artifact validation
* avoids building a custom updater system
* integrates with packaged releases
* reduces attack surface compared to custom update logic

## Update flow

1. Application checks update metadata endpoint.
2. Metadata is validated.
3. Version comparison occurs locally.
4. User is notified of available update.
5. User approves update installation.
6. Signed artifact downloads through HTTPS.
7. Signature verification occurs before installation.
8. Update installs after application restart or controlled shutdown.
9. Application relaunches into new version.

---

# 5.6 Update metadata

Update metadata must include:

| Field                      | Purpose                            |
| -------------------------- | ---------------------------------- |
| Version                    | Semantic release identifier        |
| Release date               | Build/release timestamp            |
| Artifact URL               | Signed installer/update package    |
| Signature                  | Artifact verification              |
| Release notes              | Human-readable update summary      |
| Minimum compatible version | Optional compatibility enforcement |
| Channel                    | Stable/beta/future channels        |

Exact schema:

* determined by Tauri updater requirements
* must remain compatible with official Tauri updater expectations

---

# 5.7 Release channels

## v1 requirement

Only one channel:

* stable

## Future channels

Deferred:

* beta
* nightly
* internal testing

Reason for deferral:

* reduced operational complexity
* simpler rollback management
* easier support coordination

---

# 5.8 Versioning strategy

Preferred versioning:

* Semantic Versioning (SemVer)

Example:

* `0.1.0`
* `1.0.0`

Rules:

* Breaking schema changes require migration handling
* Database migrations must be forward-compatible within supported upgrade paths
* Downgrade compatibility is not guaranteed

---

# 5.9 GitHub Actions pipeline architecture

The CI/CD pipeline performs:

1. Checkout repository
2. Install Rust toolchain
3. Install Node.js dependencies
4. Install frontend dependencies
5. Run frontend build
6. Run Rust build
7. Run tests (where configured)
8. Run dependency audits
9. Package Tauri application
10. Sign artifacts
11. Generate updater signatures
12. Publish release artifacts

---

# 5.10 Signing architecture

## Requirement

All production release artifacts must be code-signed.

## Preferred approach

Use Windows-compatible code-signing certificates integrated into GitHub Actions secret storage.

## Signing scope

The following artifacts require signing:

* installer packages
* updater artifacts
* executable binaries where applicable

Unsigned artifacts:

* are development-only
* must not be distributed to production users

---

# 5.11 Update installation behavior

## Preferred behavior

Updates install only when:

* user explicitly approves installation
* active generation tasks are idle
* no export operation is active

## Deferred behavior

Automatic silent background installation:

* FUTURE
* requires additional operational and safety review

---

# 5.12 Database migration behavior during updates

## Rules

* Migrations execute during startup after update installation
* Migration state is versioned
* Failed migrations abort startup safely
* Partial migrations must not continue silently

## Recovery

If migration fails:

* startup halts
* migration error logged
* prior database backup strategy: TBD

---

# 5.13 Release hosting

## Preferred approach

Host update artifacts through HTTPS-accessible infrastructure compatible with Tauri updater requirements.

Candidate approaches:

* GitHub Releases
* dedicated HTTPS artifact hosting

Final selection:

* TBD after validating:

  * updater compatibility
  * access control requirements
  * artifact retention requirements
  * bandwidth constraints

---

# 6. Security Considerations

| ID         | Rule                                                                                       |
| ---------- | ------------------------------------------------------------------------------------------ |
| SEC-DEP-01 | All production artifacts must be signed before distribution.                               |
| SEC-DEP-02 | Update downloads must use HTTPS only.                                                      |
| SEC-DEP-03 | Updater signatures must be validated before installation.                                  |
| SEC-DEP-04 | Update metadata must not execute arbitrary scripts or commands.                            |
| SEC-DEP-05 | The updater must not bypass application trust boundaries.                                  |
| SEC-DEP-06 | CI secrets must never appear in logs or build artifacts.                                   |
| SEC-DEP-07 | Release builds must originate only from approved repositories and branches.                |
| SEC-DEP-08 | Database encryption keys must never be embedded into artifacts or CI systems.              |
| SEC-DEP-09 | Failed update installation must preserve the previous working installation where possible. |
| SEC-DEP-10 | The updater must reject malformed or unsigned metadata responses.                          |

Additional constraints inherited from the Security Design Document:

* no plaintext secret storage
* restricted outbound domains
* signed release enforcement
* structured logging without secret exposure

---

# 7. Data Model / Contracts

## 7.1 Update metadata contract

Conceptual fields:

```json
{
  "version": "1.0.0",
  "release_date": "TBD",
  "artifact_url": "TBD",
  "signature": "TBD",
  "channel": "stable",
  "notes": "TBD"
}
```

Final structure depends on:

* official Tauri updater metadata requirements
* selected hosting strategy

---

## 7.2 CI artifact contract

Release artifacts must include:

* packaged installer
* updater-compatible package
* signature metadata
* version metadata

---

## 7.3 Migration contract

Every release that changes schema must include:

* migration identifier
* migration ordering
* compatibility expectation
* startup migration execution path

---

# 8. Failure Modes

| Failure                            | Expected behavior                              |
| ---------------------------------- | ---------------------------------------------- |
| Update metadata unavailable        | Existing installation continues normally       |
| Signature verification failure     | Update rejected                                |
| HTTPS validation failure           | Update rejected                                |
| Corrupted artifact download        | Update aborted                                 |
| Migration failure                  | Startup halted safely                          |
| Signing failure in CI              | Release pipeline fails                         |
| Missing CI secret                  | Signing and release steps fail                 |
| Partial installer execution        | Existing installation preserved where possible |
| User cancels update                | Current version continues running              |
| Update server unavailable          | Manual retry available later                   |
| Database incompatible after update | Startup halted with recovery error             |
| Invalid release artifact           | Artifact rejected before installation          |

---

# 9. Open Questions

| ID        | Question                                                                              |
| --------- | ------------------------------------------------------------------------------------- |
| OQ-DEP-01 | Which Windows installer format is preferred for production: MSI or NSIS?              |
| OQ-DEP-02 | Which release hosting strategy is preferred for updater artifacts?                    |
| OQ-DEP-03 | Should startup update checks be enabled by default in v1?                             |
| OQ-DEP-04 | What rollback guarantees are required after failed migrations?                        |
| OQ-DEP-05 | Should database backup snapshots occur automatically before migrations?               |
| OQ-DEP-06 | What exact Tauri updater configuration is required for the selected hosting strategy? |
| OQ-DEP-07 | What retention period applies to release artifacts?                                   |
| OQ-DEP-08 | Which GitHub branch protections are mandatory before release publication?             |
| OQ-DEP-09 | What internal process approves production releases?                                   |
| OQ-DEP-10 | Are delta/differential updates required later or are full-package updates sufficient? |

---

# 10. Acceptance Criteria

| ID        | Criteria                                                                                  |
| --------- | ----------------------------------------------------------------------------------------- |
| AC-DEP-01 | Deployment architecture aligns with Tauri v2 packaging and updater capabilities.          |
| AC-DEP-02 | Update flows preserve local-first and secure-by-default behavior.                         |
| AC-DEP-03 | Signing requirements are explicitly defined.                                              |
| AC-DEP-04 | CI/CD expectations are documented and compatible with GitHub Actions.                     |
| AC-DEP-05 | Update verification and failure handling are documented.                                  |
| AC-DEP-06 | Local database and keyring preservation rules are defined.                                |
| AC-DEP-07 | No undocumented external infrastructure dependencies are introduced.                      |
| AC-DEP-08 | Open questions are isolated rather than guessed.                                          |
| AC-DEP-09 | Future extensibility remains possible without redesigning deployment architecture.        |
| AC-DEP-10 | The specification remains compatible with the Security Design Document and ADR decisions. |
