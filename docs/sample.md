For a complex app, the documentation folder (`/docs`) typically serves multiple audiences and purposes simultaneously. Here's what a well-structured, flexible one looks like:

```
/docs
├── architecture/          # System design, ADRs, diagrams
├── api/                   # API references, endpoint specs, OpenAPI/Swagger
├── guides/                # How-to guides for developers onboarding
├── decisions/             # Architecture Decision Records (ADRs)
├── runbooks/              # Ops playbooks — deploy, rollback, incident response
├── specs/                 # PRDs, feature specs, requirements
├── contributing/          # Code standards, PR process, branching strategy
└── changelog/             # Version history, release notes
```

**What each layer does:**

- **`architecture/`** — the "why it's built this way" layer. Diagrams, data flow, system boundaries. Invaluable when you're 6 months in and forgot your own decisions.
- **`decisions/`** — ADRs are the unsung hero. One markdown file per major decision (e.g. *"Why we chose Hono over Express"*). Keeps future-you and collaborators sane.
- **`api/`** — the contract layer. Auto-generated or manually written, but always the source of truth for integrations.
- **`specs/`** — product-side. Your PRDs, feature briefs, scope documents live here before they become code.
- **`runbooks/`** — operational muscle memory. Step-by-step: how to deploy, how to debug a crashed worker, how to roll back a bad migration.
- **`guides/`** — onboarding-oriented. How a new dev goes from zero to running the project locally in under 30 minutes.
- **`contributing/`** — team agreements. Naming conventions, commit message format, review etiquette.
- **`changelog/`** — the timeline. Structured release notes per version.