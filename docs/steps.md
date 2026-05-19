# Development Roadmap

This roadmap outlines the planned development steps, ordered from simple configuration to complex feature implementation.

## Phase 1: Immediate Setup & Configuration
- [ ] Create basic project structure in `src/`.
- [ ] Configure Tailwind CSS themes and global styles (as already initialized).
- [ ] Set up basic UI component library (shadcn/ui) as initialized.

## Phase 2: Minor Features (High-Speed Wins)
- [ ] Implement a basic landing page layout using `shadcn/ui` components.
- [ ] Create a simple mock data-fetching service for local testing.
- [ ] Build a basic settings view (theme toggle, basic config).

## Phase 3: Harder Features (Core Logic)
- [ ] Implement Tauri IPC bridge between frontend and Rust backend.
- [ ] Develop the main application orchestrator logic.
- [ ] Integrate local storage/state management (via tauri-plugin-store).

## Phase 4: Major Features (Production Readiness)
- [ ] Set up auto-updater logic using `tauri-plugin-updater`.
- [ ] Implement full code-signing and packaging workflows for cross-platform distribution.
- [ ] Add comprehensive E2E testing for critical paths.
