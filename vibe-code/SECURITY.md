# Security

## Risks
- accidental file writes
- leaked API keys
- unsafe terminal execution
- malformed prompts

## Rules
- store secrets only in the OS credential store
- do not store keys in plain text in SQLite
- require user approval for sensitive actions
- agents should request tools through the core
