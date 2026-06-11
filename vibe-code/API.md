# API

Document internal service contracts so the app stays maintainable.

## Core services
- AgentService.run()
- FileService.read()
- FileService.write()
- TerminalService.execute()
- SQLService.query()
- GitService.status()
- AIService.route()
- IndexingService.build()

## Rules
- return plain data shapes
- keep errors explicit
- avoid leaking transport details into core logic
