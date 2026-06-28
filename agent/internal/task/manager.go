package task

import (
	"fmt"
	"sync"
	"time"
	"github.com/google/uuid"
)

var idCounter int64
var idMu sync.Mutex

func generateID() string {
	idMu.Lock()
	idCounter++
	ts := time.Now().UnixMilli()
	id := fmt.Sprintf("task_%d_%d", ts, idCounter)
	idMu.Unlock()
	return id
}

type Manager struct {
	mu     sync.RWMutex
	tasks  map[string]*Task
	queued []string
}

func NewManager() *Manager {
	return &Manager{
		tasks: make(map[string]*Task),
	}
}

func (m *Manager) Submit(t *Task) string {
	m.mu.Lock()
	defer m.mu.Unlock()

	if t.ID == "" {
		t.ID = uuid.New().String()
	}
	t.Status = StatusPending
	t.CreatedAt = time.Now()
	m.tasks[t.ID] = t
	m.queued = append(m.queued, t.ID)
	return t.ID
}

func (m *Manager) Get(id string) (*Task, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	t, ok := m.tasks[id]
	return t, ok
}

func (m *Manager) Dequeue() *Task {
	m.mu.Lock()
	defer m.mu.Unlock()

	if len(m.queued) == 0 {
		return nil
	}

	id := m.queued[0]
	m.queued = m.queued[1:]

	t, ok := m.tasks[id]
	if !ok {
		return nil
	}

	t.Status = StatusRunning
	return t
}

func (m *Manager) Complete(id, result string, steps int) {
	m.mu.Lock()
	defer m.mu.Unlock()

	t, ok := m.tasks[id]
	if !ok {
		return
	}

	now := time.Now()
	t.Status = StatusCompleted
	t.Result = result
	t.Steps = steps
	t.CompletedAt = &now

	if t.CreatedAt.IsZero() {
		t.DurationMs = 0
	} else {
		t.DurationMs = now.Sub(t.CreatedAt).Milliseconds()
	}
}

func (m *Manager) Fail(id, errMsg string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	t, ok := m.tasks[id]
	if !ok {
		return
	}

	now := time.Now()
	t.Status = StatusFailed
	t.Error = errMsg
	t.CompletedAt = &now

	if !t.CreatedAt.IsZero() {
		t.DurationMs = now.Sub(t.CreatedAt).Milliseconds()
	}
}

func (m *Manager) Cancel(id string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	t, ok := m.tasks[id]
	if !ok {
		return
	}

	if t.Status == StatusPending || t.Status == StatusRunning {
		t.Status = StatusCancelled
		now := time.Now()
		t.CompletedAt = &now
	}

	for i, qid := range m.queued {
		if qid == id {
			m.queued = append(m.queued[:i], m.queued[i+1:]...)
			break
		}
	}
}

func (m *Manager) List() []*Task {
	m.mu.RLock()
	defer m.mu.RUnlock()

	result := make([]*Task, 0, len(m.tasks))
	for _, t := range m.tasks {
		result = append(result, t)
	}
	return result
}

func (m *Manager) ListBySession(sessionID string) []*Task {
	m.mu.RLock()
	defer m.mu.RUnlock()

	var result []*Task
	for _, t := range m.tasks {
		if t.SessionID == sessionID {
			result = append(result, t)
		}
	}
	return result
}

func (m *Manager) QueueLength() int {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return len(m.queued)
}
