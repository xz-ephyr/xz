# Agent Rules Generation Prompt
> Paste this as your first message when starting a new project session with a coding agent. The agent must follow every step in order before writing any rules or any code.

---

## Your Instructions

You are about to work on a software project. Before you do anything else — before planning, before suggesting, before writing a single line of code or rules — you must complete the following steps **in order**. Do not skip any step. Do not combine steps. Complete each one fully before moving to the next.

---

### STEP 1 — Read the Project First

Explore the project structure silently and thoroughly. Read the following, in this order:

1. The root directory listing — understand the top-level layout.
2. `README.md` — understand what this project is and what it does.
3. `package.json` / `pyproject.toml` / equivalent — understand the tech stack, dependencies, and scripts.
4. `/docs` folder (if it exists) — read every file inside: architecture docs, ADRs, specs, runbooks.
5. Any existing `CLAUDE.md`, `AGENTS.md`, `.cursorrules`, or similar instruction files.
6. The folder structure of `src/`, `apps/`, `packages/`, `services/`, or equivalent source directories — understand how the codebase is organized.
7. Any config files: `tsconfig.json`, `.env.example`, `docker-compose.yml`, CI config (`.github/workflows/`) — understand the environment and constraints.

After reading, hold everything you found in context. Do not summarize it yet. Proceed to Step 2.

---

### STEP 2 — Ask Me These Questions

Once you have read the project, ask me the following questions **all at once in a single message**. Do not ask them one by one across multiple turns. Number each question clearly. Wait for my full response before proceeding.

1. **What is this project trying to do?** Describe the core purpose in plain language — who it serves, what problem it solves, and what success looks like.

2. **What is the current stage of the project?** (e.g. early prototype, active development, pre-launch, production with live users)

3. **Who will be working on this codebase?** (e.g. solo, small team, open-source contributors, contractors)

4. **What parts of the codebase are most sensitive or critical?** Name the modules, services, or layers I must treat with extra care and never modify without explicit instruction.

5. **What are the hard boundaries of this project?** Tell me what is completely out of scope — features I must never add, systems I must never touch, integrations I must never introduce.

6. **Are there any existing patterns, conventions, or architectural decisions I must always follow?** (e.g. always use a specific error format, always go through a specific service layer, never write raw SQL, always use a particular state management approach)

7. **What does "done" look like for tasks on this project?** What is your definition of a complete, shippable piece of work?

8. **Are there any known weak spots, technical debt areas, or landmines in the codebase I should be aware of?** Things that are broken, fragile, or that I should avoid touching unless explicitly told to.

9. **What is your tolerance for me making independent decisions?** Should I ask before every non-trivial choice, or do you trust me to make calls within the established patterns and flag anything unusual after the fact?

10. **Any other rules, preferences, or constraints that are unique to this project that you want permanently encoded?**

---

### STEP 3 — Generate the Project Rules File

After I answer your questions, combine what you learned from reading the project (Step 1) with my answers (Step 2) to produce a file called `PROJECT_RULES.md`.

This file must contain the following sections:

---

#### `PROJECT_RULES.md` Structure

```
# PROJECT_RULES.md
> Auto-generated from project scan and owner interview.
> This file is the law of this codebase. Every task must be executed within these boundaries.
```

**1. Project Identity**
A clear, 3–5 sentence description of what this project is, what it does, who it serves, and what it must eventually become. This is the north star. Every decision made in this codebase must serve this identity.

**2. Tech Stack Snapshot**
A factual list of every major technology in use: language, runtime, framework, database, queue, auth, infra, deployment targets. No opinions — just facts pulled from the project itself.

**3. Architectural Boundaries**
The structural rules of how this system is organized:
- What layers exist and what each one is responsible for.
- What is allowed to call what (e.g. "routes call services, services call repositories, repositories call the database — never skip a layer").
- What must never be coupled together.

**4. Inviolable Rules — Never Break These**
A numbered list of absolute constraints. These are non-negotiable, derived from both the project scan and the owner's answers. Each rule must include:
- The rule itself, stated plainly.
- *Why* it exists — the consequence of breaking it.

Example format:
```
1. Never write direct database queries outside of the repository layer.
   WHY: Bypassing the repository layer destroys the ability to mock data access in tests
   and makes schema migrations unpredictable.

2. Never hardcode environment-specific values in source code.
   WHY: This project deploys to multiple environments. Hardcoded values will cause
   silent failures in staging or production with no clear error trail.
```

**5. Scope Boundaries — What This Agent Must Never Do**
A clear list of what is explicitly out of scope for any task on this project. This includes:
- Features, modules, or systems the owner said are out of scope.
- Refactors or changes the agent must never initiate on its own.
- External integrations, services, or APIs the agent must never introduce without explicit instruction.
- Any areas of the codebase flagged as fragile, in-progress by others, or off-limits.

For each boundary, state the consequence of exceeding it:
```
- Do not touch the legacy /v1 API routes.
  CONSEQUENCE: These routes are consumed by third-party clients the team no longer
  controls. Any uncoordinated change will break external integrations silently.
```

**6. Decision-Making Protocol**
Based on the owner's stated tolerance for autonomous decisions:
- What kinds of decisions can the agent make independently?
- What kinds of decisions require a pause and explicit owner approval?
- What is the escalation format when a blocker is encountered?

**7. Definition of Done**
A checklist derived from the owner's answer to question 7. Every task on this project is only complete when all items on this checklist are satisfied.

**8. Known Landmines**
A list of the fragile, broken, or debt-heavy areas the agent must approach with extreme caution or avoid entirely until told otherwise. For each entry, describe what it is and what the risk is.

---

### STEP 4 — Confirm Before Saving

Once you have drafted `PROJECT_RULES.md`, present the full document to me **before saving or acting on it**. Ask me:

> "Here is the PROJECT_RULES.md I've generated based on the project scan and your answers. Please review it carefully. Let me know if anything is incorrect, missing, or needs to be adjusted. Once you confirm, I will treat this file as the binding law for all work on this project."

Do not proceed with any task until I confirm the rules.

---

### STEP 5 — Operate Within the Rules

From this point forward, every task you perform on this project must:

- Be checked against `PROJECT_RULES.md` before implementation begins.
- Respect the scope boundaries without exception.
- Follow the inviolable rules without exception.
- Use the decision-making protocol defined in section 6 when judgment calls are needed.
- Be verified against the definition of done in section 7 before being marked complete.

If at any point a task would require violating a rule or exceeding a scope boundary, **stop immediately**, explain which rule is being violated and why, and ask for explicit instruction before proceeding.

You are not permitted to reason your way around a rule because the task "requires it." If the task conflicts with the rules, the rules win — or the rules get updated by the owner consciously. Never by you unilaterally.

---