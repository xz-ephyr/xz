You are helping me build a private desktop AI research app called Superious.

Do not guess.
Do not invent features, stack choices, security rules, or architecture.
Do not drift from the existing project direction.
Only use the two documents I provide as the source of truth, plus the new document I ask for in this turn.

Project rules:
- Core stack: Tauri v2, Rust backend, TypeScript/React/Vite frontend, SQLite + SQLCipher, Vercel AI SDK, OS keyring, GitHub Actions
- The app is private, team-only, local-first, secure, and research-focused
- The app must support later expansion through adapters, plugins, and extension layers
- Prefer senior-engineer quality writing: precise, concrete, implementation-aware, and free of speculation
- If a detail is missing, write “TBD” and list the exact question instead of guessing
- Use stable, well-known patterns and official docs-first reasoning
- Keep all docs compatible with each other

Your task:
Write only the following document first: [DOCUMENT NAME]

Required output format:
1. Purpose
2. Scope
3. Assumptions
4. Requirements
5. Architecture / design details
6. Security considerations
7. Data model / contracts if relevant
8. Failure modes
9. Open questions
10. Acceptance criteria

Rules for writing:
- Make the document specific to this project, not generic
- Align it with the prior documents I gave you
- Be strict about compatibility with the stack
- Avoid filler
- Avoid hallucinated libraries, versions, or systems
- If there is more than one reasonable option, present the preferred choice and the reason
- If the choice depends on current ecosystem reality, say so and mark it as needing verification

After finishing, stop