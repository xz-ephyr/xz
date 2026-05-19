# research.md — Feature Research & Planning Protocol

---

## PHASE 0 — Pause Before Everything

Before you write a single line of code or ask a single question:

- Read the user's request fully.
- Do NOT start implementing.
- Do NOT ask clarifying questions yet — your job is to surface answers yourself first.
- Proceed through all phases below in order.
- Save the completed plan to `./docs/[feature-name]-plan.md` (see PHASE 6).

---

## PHASE 1 — Feature Restatement

Rewrite the user's request as a precise, unambiguous technical statement.

**Format:**

```
## Feature: [Name]

**As stated by user:** "[exact user input]"

**Technical interpretation:**
[1–3 sentences restating what this feature does in engineering terms — no assumptions, no scope creep.]

**Primary goal:** [One sentence. What does success look like?]
```

Rules:
- Do not add features the user did not ask for.
- Do not remove scope the user clearly implied.
- If the user's statement is contradictory, flag it here — do not silently resolve it.

---

## PHASE 2 — Inclusive Scope (What Must Be Built)

List every technical artifact that MUST exist for this feature to work.
Be exhaustive. Think like a senior engineer who has shipped this exact feature before.

**Cover all of the following categories that apply:**

### 2.1 UI / Frontend
- Components to create or modify (name them specifically)
- New routes or pages
- Loading states for every async action
- Empty states (no data, zero results)
- Error states (network failure, validation errors, permission denied)
- Responsive behavior (mobile, tablet, desktop — if applicable)
- Accessibility requirements (keyboard nav, aria labels, focus management)

### 2.2 State Management
- New state variables or stores needed
- Derived/computed values
- State that must persist (localStorage, URL params, session)
- State that must be cleared or reset on certain events

### 2.3 API / Backend
- New endpoints to create (method, path, request shape, response shape)
- Existing endpoints to modify
- Input validation rules per field (type, required, min/max, format)
- Response status codes and error payloads
- Pagination, sorting, or filtering behavior if the endpoint returns a list

### 2.4 Database
- New tables or collections
- New columns or fields on existing tables
- Indexes needed for query performance
- Foreign keys or relations
- Migration strategy (can it run safely on live data?)

### 2.5 Authentication & Authorization
- Who can access this feature? (roles, permissions)
- What happens when an unauthorized user tries to access it?
- Does this feature expose data that must be scoped to the current user?

### 2.6 Types & Interfaces
- New TypeScript types, interfaces, or enums
- Existing types that need to be extended

### 2.7 Third-Party / External
- External APIs, SDKs, or services required
- Environment variables to add
- Rate limits or quotas to be aware of

### 2.8 Edge Cases (Mandatory — Do Not Skip)

List at least 5 edge cases. Examples:
- What if the API call fails mid-operation?
- What if the user submits twice quickly (double-submit)?
- What if required data from another service is missing?
- What if the user's session expires mid-flow?
- What if input contains special characters or is unexpectedly long?
- What if the feature is used on a slow or offline network?

---

## PHASE 3 — Exclusive Scope (What Is NOT Included)

Explicitly list what is out of scope for this implementation.

This section exists to prevent scope creep during implementation and to set clear expectations.

**Format:**

```
### Out of Scope
- [Thing that might seem related but is not part of this task]
- [Feature that could be a natural extension but is deferred]
- [Edge case that won't be handled in this iteration]
```

Rules:
- Be specific. "Performance optimizations" is too vague. "Lazy loading of the image gallery" is correct.
- If something is out of scope but important, mark it: `⚠️ Deferred — recommend follow-up task`

---

## PHASE 4 — Technical Gap Analysis

This is the most important phase. Surface everything the user forgot, missed, or did not know to ask.

Think like the senior engineer who will be asked to review this spec. What would they push back on?

**Cover:**

- **Missing requirements** — things the feature cannot work without that the user did not mention
- **Ambiguities** — statements that could be interpreted in two or more different ways
- **Conflicts** — this feature may conflict with existing behavior in [X]
- **Hidden complexity** — something that looks simple but has known implementation traps
- **Security concerns** — data exposure, injection risks, auth gaps, CORS issues
- **Performance concerns** — N+1 queries, unindexed lookups, large payloads, polling vs. websockets
- **Observability** — does this need logging, error tracking, or analytics events?

**Format per gap:**

```
⚠️ GAP: [Short title]
   What's missing: [Explanation]
   Recommended resolution: [What should be decided or added]
   Priority: [Blocker / High / Medium / Low]
```

---

## PHASE 5 — Implementation Plan

Break the feature into ordered, atomic implementation steps.

Rules:
- Each step must be a single, completable unit of work.
- Steps must be in dependency order — no step should require something built in a later step.
- Name the exact file(s) affected per step where possible.
- Mark steps that need user decisions before work can begin with: `🔴 BLOCKED — awaiting decision`

**Format:**

```
### Implementation Steps

[ ] Step 1: [Action] — affects [file or layer]
[ ] Step 2: [Action] — affects [file or layer]
[ ] Step 3: [Action] — affects [file or layer]
...
```

Group steps into layers if helpful:
- `[DB]` — database / migrations
- `[API]` — backend / server
- `[STATE]` — state management
- `[UI]` — frontend components
- `[TEST]` — tests
- `[INFRA]` — env vars, config, deployment

---

## PHASE 6 — Save the Plan

After completing all phases, save the full document to:

```
./docs/[feature-name]-plan.md
```

Where `[feature-name]` is a lowercase, hyphenated version of the feature name.

Examples:
- `./docs/google-oauth-plan.md`
- `./docs/bulk-export-csv-plan.md`
- `./docs/notification-system-plan.md`

**The saved document must include:**
1. Feature name and date
2. All sections from Phase 1–5
3. A `## Open Questions` section listing anything still requiring user input
4. A `## Decision Log` section (empty by default, to be filled as decisions are made)

**Template for the saved file header:**

```markdown
# [Feature Name] — Technical Plan

**Date:** [today's date]
**Status:** Draft | In Review | Approved
**Requested by:** User
**Planned by:** Gemini (via @research.md)

---
```

---

## PHASE 7 — Questions for the User

Only after completing all phases above, list the questions you still need answered before implementation can begin.

Rules:
- Prioritize questions — blockers first.
- Do not ask questions you could answer yourself with a quick search.
- Do not ask more than 5 questions. If you have more, rank and trim.
- Frame questions as specific decisions, not open-ended prompts.

**Format:**

```
### Questions Before Implementation

1. 🔴 [Blocker] — [Specific question requiring user decision]
2. 🟡 [High] — [Question that affects architecture]
3. 🟢 [Low] — [Nice-to-have clarification]
```

---

## Tone & Style Rules

When producing the plan document, write like a senior engineering manager presenting a spec to a team:

- Use precise technical language. No hand-waving.
- Use active voice. "Create a `POST /api/auth/google` endpoint" not "An endpoint will need to be created."
- Quantify where possible. "Validate that username is 3–32 characters, alphanumeric plus underscores" not "validate the username."
- Do not pad the document with motivational language or summaries of what was said.
- Call out risks clearly — do not bury them.
- If something is technically dangerous, say so plainly.

---

## What Success Looks Like

When you have followed this protocol correctly, the output document will:

✅ Be readable by a developer who has never heard of this feature and still know exactly what to build  
✅ Surface at least 3 things the user did not mention  
✅ Have zero implementation ambiguity for each step  
✅ Be saved to `./docs/` and ready to be turned into tickets  

---

*End of research.md*