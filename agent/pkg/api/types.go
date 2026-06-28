package api

import "time"

type AgentTask struct {
	ID          string            `json:"id"`
	SessionID   string            `json:"sessionId"`
	Type        string            `json:"type"`
	Status      string            `json:"status"`
	Prompt      string            `json:"prompt"`
	Context     string            `json:"context,omitempty"`
	Model       string            `json:"model,omitempty"`
	MaxSteps    int               `json:"maxSteps,omitempty"`
	ToolScope   []string          `json:"toolScope,omitempty"`
	Tools       []ToolCall        `json:"tools,omitempty"`
	Result      string            `json:"result,omitempty"`
	Error       string            `json:"error,omitempty"`
	Steps       int               `json:"steps,omitempty"`
	DurationMs  int64             `json:"durationMs,omitempty"`
	ParentID    string            `json:"parentId,omitempty"`
	SubtaskIDs  []string          `json:"subtaskIds,omitempty"`
	Metadata    map[string]any    `json:"metadata,omitempty"`
	CreatedAt   time.Time         `json:"createdAt"`
	CompletedAt *time.Time        `json:"completedAt,omitempty"`
}

type ToolCall struct {
	ID       string         `json:"id"`
	Tool     string         `json:"tool"`
	Params   map[string]any `json:"params"`
	Result   any            `json:"result,omitempty"`
	Error    string         `json:"error,omitempty"`
	Duration int64          `json:"durationMs,omitempty"`
}

type ToolDefinition struct {
	Name        string              `json:"name"`
	Description string              `json:"description"`
	Category    string              `json:"category"`
	Parameters  map[string]ParamDef `json:"parameters"`
}

type ParamDef struct {
	Type        string   `json:"type"`
	Description string   `json:"description"`
	Required    bool     `json:"required"`
	Enum        []string `json:"enum,omitempty"`
	Default     any      `json:"default,omitempty"`
}

type MCPConfig struct {
	ServerName string `json:"serverName"`
	Command    string `json:"command,omitempty"`
	Args       []string `json:"args,omitempty"`
	URL        string `json:"url,omitempty"`
	Transport  string `json:"transport"`
}

type TaskRequest struct {
	SessionID string   `json:"sessionId"`
	Type      string   `json:"type"`
	Prompt    string   `json:"prompt"`
	Context   string   `json:"context,omitempty"`
	Model     string   `json:"model,omitempty"`
	MaxSteps  int      `json:"maxSteps,omitempty"`
	ToolScope []string `json:"toolScope,omitempty"`
}

type TaskResult struct {
	TaskID    string `json:"taskId"`
	Status    string `json:"status"`
	Result    string `json:"result,omitempty"`
	Error     string `json:"error,omitempty"`
	Steps     int    `json:"steps,omitempty"`
	DurationMs int64 `json:"durationMs,omitempty"`
}

type HealthResponse struct {
	Status    string `json:"status"`
	Version   string `json:"version"`
	Uptime    string `json:"uptime"`
	Workers   int    `json:"workers"`
	TasksInQ  int    `json:"tasksInQueue"`
	ExpressOK bool   `json:"expressConnected"`
}
