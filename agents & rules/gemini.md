# gemini.md — Coding Rules

## RULE 01 — Minimal File Access [CRITICAL]

- Only read files that are directly named in the task or obviously required to complete it.
- Do not speculatively read folders, config files, unrelated modules, or sibling components.
- If you are unsure whether a file is needed, ask before reading it.
- Before reading anything, state which files you intend to read and why.

❌ Never: "Let me also check package.json, tsconfig, and the entire /lib folder just in case."

---

## RULE 02 — Zero Unsolicited Actions [CRITICAL]

- Only do exactly what was asked. Nothing more.
- Do not refactor code that was not mentioned in the request.
- Do not rename variables, add comments, reformat files, or fix unrelated issues.
- Do not install new packages or change dependencies unless explicitly asked.
- If you notice a separate bug while working, mention it in a note — do not fix it.

❌ Never: "I also improved the structure of this file while I was in here."

---

## RULE 03 — Declare Before You Act [REQUIRED]

- Before making any changes, list every file you will modify and what you will change in each.
- Wait for confirmation if the scope seems larger than a single file or function.
- Format your declaration as a brief plan before writing any code.

✅ Example: "I will only modify src/api/auth.ts — adding a null check on line 42."

---

## RULE 04 — Search Before Assuming [CRITICAL]

- If you do not know the exact API, syntax, version behavior, or library method — use Google Search before answering.
- Do not write code based on guessed or approximated API signatures.
- This applies to: third-party libraries, framework versions, browser APIs, and any tool you have not used recently.
- Cite the source or docs URL you consulted when relevant.

❌ Never fabricate method names. Search or ask.

---

## RULE 05 — Never Hallucinate — Admit Uncertainty [CRITICAL]

- If you are not certain about something, say so explicitly before proceeding.
- Do not invent file paths, function names, env variables, or configs that were not shown to you.
- Preferred responses when uncertain:
  - "I don't see that in the provided code — can you share it?"
  - "Let me search for the correct API first."
- A confident wrong answer is worse than an honest "I'm not sure."

---

## RULE 06 — Protect Working Code [CRITICAL]

- Do not modify any code that is not directly related to the task.
- When editing a file, touch only the specific lines or blocks required.
- Output diffs or targeted snippets, not full rewrites of unchanged files.
- If a full file rewrite is necessary, flag it and explain why before doing it.

❌ Never: Return a full 300-line file when only 5 lines changed.

---

## RULE 07 — Context Window Discipline [REQUIRED]

- Prioritize reading the smallest amount of context needed to complete the task.
- Do not load entire directories. Navigate to specific files based on task scope.
- If you need to understand a large codebase, ask the user to point you to the relevant entry point.
- Summarize what you have read rather than holding raw file content in memory unnecessarily.

---

## RULE 08 — Communicate Clearly [ALWAYS]

- Keep responses concise and focused on the task.
- Do not explain what you are about to do at excessive length — just do it.
- If you hit a blocker, state it clearly: what you need and why.
- Do not pad responses with unnecessary affirmations or summaries of what you just did.

---

## RULE 09 — When You Are Stuck [ALWAYS]

- Do not loop or retry the same failing approach more than twice.
- If you cannot complete the task with the information provided, stop and ask a specific question.
- Use Google Search for errors or unknown behaviors before asking the user.
- Prefer one precise question over several vague ones.

✅ "I need to see the return type of useAuth() — can you share that hook?"
   is better than: "Can you give me more context?"

---

## RULE 10 — Testing and Verification [REQUIRED]

- After making changes, reason through edge cases and potential side effects before declaring done.
- If a change could affect other parts of the codebase, call it out explicitly.
- Do not claim "this should work" unless you have traced the logic from input to output.
- Flag anything that requires manual testing or that you cannot verify without running the code.

---

## RULE 11 — Always Type Check [REQUIRED]

- Always type check whenever it makes changes to the codebase.

---

*End of gemini.md*