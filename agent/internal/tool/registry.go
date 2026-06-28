package tool

import (
	"fmt"
	"sync"
	"github.com/xz-ephyr/raw-code/agent/pkg/api"
)

type Registry struct {
	mu    sync.RWMutex
	tools map[string]api.ToolDefinition
}

func NewRegistry() *Registry {
	return &Registry{
		tools: make(map[string]api.ToolDefinition),
	}
}

func (r *Registry) Register(def api.ToolDefinition) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.tools[def.Name]; exists {
		return fmt.Errorf("tool %q already registered", def.Name)
	}
	r.tools[def.Name] = def
	return nil
}

func (r *Registry) Get(name string) (api.ToolDefinition, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	def, ok := r.tools[name]
	return def, ok
}

func (r *Registry) List() []api.ToolDefinition {
	r.mu.RLock()
	defer r.mu.RUnlock()

	result := make([]api.ToolDefinition, 0, len(r.tools))
	for _, def := range r.tools {
		result = append(result, def)
	}
	return result
}

func (r *Registry) ListByCategory(category string) []api.ToolDefinition {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var result []api.ToolDefinition
	for _, def := range r.tools {
		if def.Category == category {
			result = append(result, def)
		}
	}
	return result
}

func (r *Registry) Remove(name string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	delete(r.tools, name)
}

func DefaultTools() []api.ToolDefinition {
	return []api.ToolDefinition{
		{
			Name:        "web_search",
			Description: "Search the web for up-to-date information on any topic",
			Category:    "research",
			Parameters: map[string]api.ParamDef{
				"query":       {Type: "string", Description: "The search query", Required: true},
				"max_results": {Type: "number", Description: "Max results (1-10)", Required: false, Default: 5},
			},
		},
		{
			Name:        "fetch_page",
			Description: "Fetch the full content of a webpage as markdown or text",
			Category:    "research",
			Parameters: map[string]api.ParamDef{
				"url":    {Type: "string", Description: "The URL to fetch", Required: true},
				"format": {Type: "string", Description: "Output format", Required: false, Default: "markdown", Enum: []string{"markdown", "text"}},
			},
		},
		{
			Name:        "code_search",
			Description: "Search for code patterns across the project codebase using regex",
			Category:    "code",
			Parameters: map[string]api.ParamDef{
				"pattern":  {Type: "string", Description: "Regex pattern to search for", Required: true},
				"path":     {Type: "string", Description: "Optional directory path to scope the search", Required: false},
				"max_matches": {Type: "number", Description: "Maximum number of matches to return", Required: false, Default: 20},
			},
		},
		{
			Name:        "read_file",
			Description: "Read the contents of a file from the project filesystem",
			Category:    "code",
			Parameters: map[string]api.ParamDef{
				"path":   {Type: "string", Description: "Absolute or relative file path", Required: true},
				"offset": {Type: "number", Description: "Starting line (1-indexed)", Required: false},
				"limit":  {Type: "number", Description: "Max lines to read", Required: false},
			},
		},
		{
			Name:        "run_command",
			Description: "Execute a shell command in the project directory",
			Category:    "system",
			Parameters: map[string]api.ParamDef{
				"command": {Type: "string", Description: "Shell command to execute", Required: true},
				"timeout": {Type: "number", Description: "Timeout in seconds", Required: false, Default: 30},
				"workdir": {Type: "string", Description: "Working directory", Required: false},
			},
		},
		{
			Name:        "delegate_task",
			Description: "Delegate a complex task to a sub-agent that runs autonomously",
			Category:    "system",
			Parameters: map[string]api.ParamDef{
				"task":      {Type: "string", Description: "Detailed description of the task to delegate", Required: true},
				"context":   {Type: "string", Description: "Relevant context from the conversation", Required: false},
				"tool_scope": {Type: "string", Description: "Comma-separated tool categories the sub-agent may use", Required: false},
				"model":     {Type: "string", Description: "Optional model override for sub-agent", Required: false},
			},
		},
		{
			Name:        "list_directory",
			Description: "List files and directories in a project path",
			Category:    "code",
			Parameters: map[string]api.ParamDef{
				"path":    {Type: "string", Description: "Directory path to list", Required: true},
				"pattern": {Type: "string", Description: "Optional glob pattern to filter results", Required: false},
			},
		},
		{
			Name:        "run_workflow",
			Description: "Execute a predefined multi-step workflow by name",
			Category:    "system",
			Parameters: map[string]api.ParamDef{
				"workflow":  {Type: "string", Description: "Name of the workflow to run", Required: true},
				"params":    {Type: "string", Description: "JSON object of workflow parameters", Required: false},
			},
		},
	}
}

func (r *Registry) RegisterDefaults() {
	for _, def := range DefaultTools() {
		r.tools[def.Name] = def
	}
}
