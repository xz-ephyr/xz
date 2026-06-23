# Schedule Tab (`/schedule`) — Ideas

> **Date:** 2026-06-23
> **Icon (Hugeicons):** `AlarmClockIcon`
> **Currently:** 6-line placeholder stub in `src/pages/SchedulePage.tsx`

---

## Concept

A **scheduled / recurring task manager** for the AI — "run this prompt every morning," "summarize my project every Friday," "remind me about X."

---

## Possible Features

| Feature | Description |
|---------|-------------|
| **Cron-based prompts** | User writes a prompt + cron expression (or friendly preset: "Daily", "Weekly Mon-Fri", "Custom"). The AI runs the prompt on schedule and stores the result. |
| **Scheduled artifact generation** | Schedule the AI to regenerate a report, dashboard, or document at intervals. |
| **Reminders** | Simple alarm/reminder tied to a chat thread or project. "Remind me about this PR in 2 hours." |
| **History log** | Table of past runs: timestamp, prompt used, status (success/failed), link to result. |
| **Status badges** | Active / Paused / Completed / Failed states per schedule. Toggle on/off. |
| **Calendar view (stretch)** | Optional visual calendar showing scheduled runs across days. |

---

## Data Model (speculative)

```ts
interface ScheduledTask {
  id: string;
  title: string;
  prompt: string;
  cron: string;
  preset: 'daily' | 'weekdays' | 'weekly' | 'custom';
  projectId?: string;
  modelName?: string;
  enabled: boolean;
  lastRunAt?: number;
  nextRunAt: number;
  createdAt: number;
}

interface ScheduledTaskRun {
  id: string;
  taskId: string;
  startedAt: number;
  finishedAt: number;
  status: 'running' | 'success' | 'failed';
  resultPreview?: string;
  error?: string;
  outputSessionId?: string;
}
```

---

## Scheduling Engine Options

- **Server-side** (if backend exists): cron job / setTimeout loop.
- **Client-side**: `setInterval` polling + `navigator.serviceWorker` + `Notification` API for browser reminders.
- **Hybrid**: Tauri backend uses a Rust cron library; web falls back to SW.

---

## UI Mock Layout

```
┌──────────────────────────────────────────────┐
│  Schedule                          [+ Add]   │
│                                                     │
│  ┌──────────────────────────────────────┐ │
│  │ 🔍 Search schedules...              │ │
│  └──────────────────────────────────────┘ │
│                                                     │
│  ┌─ Active ──────────────────────────────┐ │
│  │  Daily Standup             🔄 Active    │ │
│  │  Every weekday at 9 AM                │ │
│  │  Last run: Today 9:00 AM — OK       │ │
│  │                               ⚙️ ⏸️ 🗑️ │ │
│  ├──────────────────────────────────────┤ │
│  │  Weekly Report             🔄 Active    │ │
│  │  Every Monday at 8 AM                 │ │
│  │  Last run: Jun 22 — OK              │ │
│  │                               ⚙️ ⏸️ 🗑️ │ │
│  └──────────────────────────────────────┘ │
│                                                     │
│  ┌─ Paused ──────────────────────────────┐ │
│  │  Project Summary           ⏸️ Paused    │ │
│  │  Every Fri at 5 PM                    │ │
│  │  Last run: Jun 19 — Failed          │ │
│  │                               ⚙️ ▶️ 🗑️ │ │
│  └──────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

---

## Implementation Priority

1. Create/list/delete scheduled tasks (CRUD)
2. Toggle enable/pause
3. Client-side polling engine
4. Run history log
5. Browser notifications via Service Worker
6. Calendar view (stretch)

---

## What's Needed

| Area | Details |
|------|---------|
| **New DB tables** | `scheduled_tasks`, `scheduled_task_runs` in `DatabaseService` (IndexedDB) |
| **New service** | `ScheduledTaskManager` (like `ChatSessionManager`) + scheduling engine |
| **UI components** | `ScheduleList`, `ScheduleForm` (modal), `RunHistoryTable` |
| **Existing code to reuse** | HugeiconRenderer, Toast, confirmAsync, thin-scrollbar, search bar pattern from ChatsPage, filter dropdown pattern |
