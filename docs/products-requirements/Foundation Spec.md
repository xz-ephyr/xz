# Superious Foundation Spec

## 1. Purpose

Build a private, team-only desktop research app that turns a topic into a structured report with source citations, verification steps, and controlled AI behavior.

## 2. Product scope

The app should support:

* topic intake and refinement
* deep web search
* source ranking and citation capture
* report drafting and export
* saved research sessions
* team-only use with strict access control

It should not attempt to become a public consumer chat app. The priority is trustworthy research output, predictable agent behavior, and secure handling of API keys and internal data.

## 3. Working assumptions from the current repository

The existing repo already suggests a Tauri desktop shell, a TypeScript web layer, an autonomous research flow, search-provider integration, and model-provider flexibility. It also already points toward source grounding and structured reporting, so the documentation should formalize those behaviors before more code is added.

## 4. Architecture baseline

Use a split architecture:

* Tauri for the desktop shell
* TypeScript frontend for the UI and state management
* Rust backend for local OS integration, security-sensitive tasks, and app control
* a provider layer for AI models
* a provider layer for search and retrieval
* local persistence for sessions, drafts, settings, and cached artifacts

Trust boundaries should be explicit. The frontend should never hold long-lived secrets. Sensitive actions should pass through a controlled backend layer.

## 5. Security baseline

Define these rules before feature work:

* store API keys only in OS-backed secure storage
* encrypt local data at rest where appropriate
* never log secrets, auth tokens, or raw provider keys
* require explicit permission for any action that touches external systems
* restrict outgoing network calls to approved providers
* validate every tool input and output
* disable unsafe web access patterns by default
* keep a clear audit trail for agent actions that affect data

If the app ever handles team-specific notes, private sources, or internal documents, the security model must be tightened before those features ship.

## 6. AI behavior baseline

The AI layer should be defined as a controlled assistant, not a free-form autonomous actor.

It should:

* accept a topic or task
* create a research plan
* search approved sources
* extract evidence
* cite claims to sources
* flag uncertainty instead of inventing answers
* stop when evidence is thin
* separate facts, assumptions, and recommendations

It should not:

* fabricate citations
* run unbounded actions without a stop condition
* overwrite user work silently
* make hidden provider calls outside the approved flow

## 7. Data model baseline

At minimum, define storage for:

* users or team identities if needed
* research sessions
* prompts and topics
* retrieved sources and snapshots
* extracted claims
* citations and evidence links
* drafts and final reports
* app settings and provider settings
* audit events

Every stored object should have a clear owner, retention rule, and deletion path.

## 8. Tool contract baseline

Document every internal and external tool as a contract.

Each tool spec should include:

* name
* purpose
* allowed inputs
* allowed outputs
* validation rules
* failure modes
* retry behavior
* timeout behavior
* permission requirements
* whether it may access the network or filesystem

This is important for search tools, model tools, citation tools, and any future agent actions.

## 9. Documentation set to write next

The next documents should be:

1. Product Requirements Document
2. Security Design Document
3. AI Behavior / Agent Spec
4. Data Model and Retention Doc
5. Tool and API Contract Doc
6. UX Spec
7. Test Strategy
8. Release and Deployment Doc
9. Runbook
10. ADR log
11. Risk register

## 10. Immediate build gates

Do not start implementation until these are answered:

* Which providers are approved for model and search access?
* What data is allowed to leave the machine?
* What is the minimum citation standard for a valid report?
* Which actions require explicit user confirmation?
* What is the retention policy for research sessions?
* Who can access the app and how is access revoked?

## 11. Definition of readiness

The project is ready for feature build only when:

* scope is fixed
* security rules are written
* agent behavior is constrained
* storage policy is defined
* tool contracts are documented
* testing criteria are known
* release process is approved

## 12. First implementation target

Build the smallest safe vertical slice first:

* create a topic
* search sources
* store evidence
* generate a cited summary
* save the session locally

That gives the team one complete path through the system before adding advanced agent behavior.
