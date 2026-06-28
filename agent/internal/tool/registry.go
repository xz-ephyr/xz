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

		// ── Research Tools ──────────────────────────────────────────
		{
			Name:        "web_search",
			Description: "Search the web for up-to-date information on any topic. Use this when you need current information, news, documentation, or facts.",
			Category:    "research",
			Parameters: map[string]api.ParamDef{
				"query":       {Type: "string", Description: "The search query", Required: true},
				"max_results": {Type: "number", Description: "Max results (1-10)", Required: false, Default: 5},
				"site":        {Type: "string", Description: "Restrict search to a specific domain (e.g. developer.mozilla.org)", Required: false},
			},
		},
		{
			Name:        "fetch_page",
			Description: "Fetch the full content of a webpage as markdown or text. Use this to read articles, documentation, or API responses.",
			Category:    "research",
			Parameters: map[string]api.ParamDef{
				"url":    {Type: "string", Description: "The URL to fetch", Required: true},
				"format": {Type: "string", Description: "Output format", Required: false, Default: "markdown", Enum: []string{"markdown", "text"}},
			},
		},
		{
			Name:        "image_search",
			Description: "Search for images on the web by query. Returns image URLs, dimensions, and source pages.",
			Category:    "research",
			Parameters: map[string]api.ParamDef{
				"query":       {Type: "string", Description: "The image search query", Required: true},
				"max_results": {Type: "number", Description: "Max images (1-20)", Required: false, Default: 5},
				"safe_search": {Type: "boolean", Description: "Enable safe search filtering", Required: false, Default: true},
			},
		},
		{
			Name:        "news_search",
			Description: "Search for recent news articles on a topic. Returns headlines, sources, and publication dates.",
			Category:    "research",
			Parameters: map[string]api.ParamDef{
				"query":       {Type: "string", Description: "The news search query", Required: true},
				"max_results": {Type: "number", Description: "Max articles (1-10)", Required: false, Default: 5},
				"freshness":   {Type: "string", Description: "Time range for news", Required: false, Default: "week", Enum: []string{"hour", "day", "week", "month"}},
			},
		},
		{
			Name:        "search_docs",
			Description: "Search technical documentation and reference material for a given topic or library.",
			Category:    "research",
			Parameters: map[string]api.ParamDef{
				"query":   {Type: "string", Description: "Documentation search query (e.g. 'react useState typescript')", Required: true},
				"library": {Type: "string", Description: "Optional library/framework name to narrow results", Required: false},
			},
		},

		// ── Code Tools ──────────────────────────────────────────────
		{
			Name:        "code_search",
			Description: "Search for code patterns across the project codebase using regex (ripgrep). Use this to find function definitions, variable usages, imports, or any code pattern.",
			Category:    "code",
			Parameters: map[string]api.ParamDef{
				"pattern":     {Type: "string", Description: "Regex pattern to search for", Required: true},
				"path":        {Type: "string", Description: "Optional directory path to scope the search", Required: false},
				"max_matches": {Type: "number", Description: "Maximum number of matches to return", Required: false, Default: 20},
				"file_glob":   {Type: "string", Description: "Optional glob to filter files (e.g. '*.ts', '*.go')", Required: false},
			},
		},
		{
			Name:        "read_file",
			Description: "Read the contents of a file from the project filesystem. Supports offset and limit for reading specific sections of large files.",
			Category:    "code",
			Parameters: map[string]api.ParamDef{
				"path":   {Type: "string", Description: "Absolute or relative file path", Required: true},
				"offset": {Type: "number", Description: "Starting line (1-indexed)", Required: false},
				"limit":  {Type: "number", Description: "Max lines to read", Required: false},
			},
		},
		{
			Name:        "write_file",
			Description: "Write or overwrite a file with new content. Creates parent directories if they don't exist.",
			Category:    "code",
			Parameters: map[string]api.ParamDef{
				"path":    {Type: "string", Description: "Absolute or relative file path", Required: true},
				"content": {Type: "string", Description: "File content to write", Required: true},
			},
		},
		{
			Name:        "edit_file",
			Description: "Apply a patch to an existing file by replacing exact string matches. Use this for surgical edits instead of rewriting entire files.",
			Category:    "code",
			Parameters: map[string]api.ParamDef{
				"path":        {Type: "string", Description: "Absolute or relative file path", Required: true},
				"old_string":  {Type: "string", Description: "Exact string to search for and replace (must match exactly)", Required: true},
				"new_string":  {Type: "string", Description: "Replacement string", Required: true},
			},
		},
		{
			Name:        "list_directory",
			Description: "List files and directories in a project path with optional glob pattern filtering.",
			Category:    "code",
			Parameters: map[string]api.ParamDef{
				"path":    {Type: "string", Description: "Directory path to list", Required: true},
				"pattern": {Type: "string", Description: "Optional glob pattern to filter results (e.g. '*.ts', '**/*.go')", Required: false},
			},
		},
		{
			Name:        "find_files",
			Description: "Find files by name or glob pattern recursively from a root directory.",
			Category:    "code",
			Parameters: map[string]api.ParamDef{
				"pattern": {Type: "string", Description: "File name or glob pattern to search for (e.g. '*.ts', 'main.*', '**/test*')", Required: true},
				"root":    {Type: "string", Description: "Root directory to start search from", Required: false, Default: "."},
				"max_results": {Type: "number", Description: "Maximum files to return", Required: false, Default: 50},
			},
		},
		{
			Name:        "file_stats",
			Description: "Get detailed information about a file or directory: size, permissions, modification time, and line count.",
			Category:    "code",
			Parameters: map[string]api.ParamDef{
				"path": {Type: "string", Description: "Absolute or relative path to the file or directory", Required: true},
			},
		},
		{
			Name:        "count_lines",
			Description: "Count total lines of code in a directory, optionally filtered by file extension.",
			Category:    "code",
			Parameters: map[string]api.ParamDef{
				"path":     {Type: "string", Description: "Directory to count lines in", Required: false, Default: "."},
				"ext":      {Type: "string", Description: "File extension filter (e.g. 'go', 'ts', 'py'). Comma-separated for multiple.", Required: false},
				"exclude":  {Type: "string", Description: "Directories to exclude (e.g. 'node_modules,dist')", Required: false, Default: "node_modules,dist,.git,.next,build"},
			},
		},
		{
			Name:        "grep_files",
			Description: "Search file contents using a simple text query (case-insensitive by default). Simpler than code_search for quick lookups.",
			Category:    "code",
			Parameters: map[string]api.ParamDef{
				"query":       {Type: "string", Description: "Text to search for (case-insensitive)", Required: true},
				"path":        {Type: "string", Description: "Directory to search in", Required: false, Default: "."},
				"max_matches": {Type: "number", Description: "Maximum matches to return", Required: false, Default: 30},
				"file_glob":   {Type: "string", Description: "Optional glob to filter files (e.g. '*.ts')", Required: false},
			},
		},

		// ── Git Tools ───────────────────────────────────────────────
		{
			Name:        "git_status",
			Description: "Show the working tree status — modified, staged, and untracked files in the git repository.",
			Category:    "git",
			Parameters: map[string]api.ParamDef{
				"path": {Type: "string", Description: "Path to the git repository", Required: false, Default: "."},
			},
		},
		{
			Name:        "git_diff",
			Description: "Show unstaged or staged diffs for modified files in the git repository.",
			Category:    "git",
			Parameters: map[string]api.ParamDef{
				"path":     {Type: "string", Description: "Path to the git repository", Required: false, Default: "."},
				"staged":   {Type: "boolean", Description: "Show staged diff instead of unstaged", Required: false, Default: false},
				"filename": {Type: "string", Description: "Optional specific file to show diff for", Required: false},
			},
		},
		{
			Name:        "git_log",
			Description: "Show the commit log with author, date, and message for recent commits.",
			Category:    "git",
			Parameters: map[string]api.ParamDef{
				"path":  {Type: "string", Description: "Path to the git repository", Required: false, Default: "."},
				"count": {Type: "number", Description: "Number of recent commits to show", Required: false, Default: 10},
			},
		},
		{
			Name:        "git_branches",
			Description: "List all local and remote branches for a git repository.",
			Category:    "git",
			Parameters: map[string]api.ParamDef{
				"path":   {Type: "string", Description: "Path to the git repository", Required: false, Default: "."},
				"remote": {Type: "boolean", Description: "Include remote branches", Required: false, Default: true},
			},
		},
		{
			Name:        "git_show",
			Description: "Show the details of a specific commit: diff, author, date, and message.",
			Category:    "git",
			Parameters: map[string]api.ParamDef{
				"path":    {Type: "string", Description: "Path to the git repository", Required: false, Default: "."},
				"commit":  {Type: "string", Description: "Commit hash, branch name, or reference (e.g. HEAD~3)", Required: true},
			},
		},

		// ── System Tools ────────────────────────────────────────────
		{
			Name:        "run_command",
			Description: "Execute a shell command in the project directory. Use this for builds, tests, linters, or any shell operation.",
			Category:    "system",
			Parameters: map[string]api.ParamDef{
				"command": {Type: "string", Description: "Shell command to execute", Required: true},
				"timeout": {Type: "number", Description: "Timeout in seconds", Required: false, Default: 30},
				"workdir": {Type: "string", Description: "Working directory for the command", Required: false},
			},
		},
		{
			Name:        "delegate_task",
			Description: "Delegate a complex or open-ended task to a sub-agent that runs autonomously with its own tool scope.",
			Category:    "system",
			Parameters: map[string]api.ParamDef{
				"task":       {Type: "string", Description: "Detailed description of the task to delegate", Required: true},
				"context":    {Type: "string", Description: "Relevant context from the conversation for the sub-agent", Required: false},
				"tool_scope": {Type: "string", Description: "Comma-separated tool categories the sub-agent may use (research,code,git,system)", Required: false},
				"model":      {Type: "string", Description: "Optional model override for sub-agent (e.g. gemini-3.5-flash)", Required: false},
			},
		},
		{
			Name:        "run_workflow",
			Description: "Execute a predefined multi-step workflow by name. Workflows chain multiple tool calls with variable passing between steps.",
			Category:    "system",
			Parameters: map[string]api.ParamDef{
				"workflow": {Type: "string", Description: "Name of the workflow to run (e.g. research_and_summarize, codebase_audit)", Required: true},
				"params":   {Type: "string", Description: "JSON object of workflow parameters", Required: false},
			},
		},
		{
			Name:        "system_info",
			Description: "Get information about the host system: OS, architecture, CPU cores, memory, disk space, and hostname.",
			Category:    "system",
			Parameters: map[string]api.ParamDef{
				"detail": {Type: "string", Description: "Detail level: 'basic' (default) or 'full' (includes env vars, mounts)", Required: false, Default: "basic", Enum: []string{"basic", "full"}},
			},
		},
		{
			Name:        "list_processes",
			Description: "List running processes on the system with PID, name, CPU, and memory usage.",
			Category:    "system",
			Parameters: map[string]api.ParamDef{
				"filter":  {Type: "string", Description: "Optional process name filter (e.g. 'node', 'go')", Required: false},
				"max":     {Type: "number", Description: "Maximum number of processes to return", Required: false, Default: 30},
			},
		},
		{
			Name:        "resolve_path",
			Description: "Resolve a file path: expand ~, resolve symlinks, and return the absolute canonical path.",
			Category:    "system",
			Parameters: map[string]api.ParamDef{
				"path": {Type: "string", Description: "Path to resolve (supports ~, .., symlinks)", Required: true},
			},
		},

		// ── Network Tools ───────────────────────────────────────────
		{
			Name:        "http_request",
			Description: "Make a custom HTTP request to any URL. Use this for testing APIs, fetching data, or checking endpoints.",
			Category:    "network",
			Parameters: map[string]api.ParamDef{
				"url":     {Type: "string", Description: "Full URL to request", Required: true},
				"method":  {Type: "string", Description: "HTTP method", Required: false, Default: "GET", Enum: []string{"GET", "POST", "PUT", "DELETE", "PATCH", "HEAD"}},
				"headers": {Type: "string", Description: "JSON object of custom headers", Required: false},
				"body":    {Type: "string", Description: "Request body (for POST/PUT/PATCH)", Required: false},
				"timeout": {Type: "number", Description: "Timeout in seconds", Required: false, Default: 15},
			},
		},
		{
			Name:        "check_url",
			Description: "Check if a URL is reachable and return its HTTP status code, response time, and content type.",
			Category:    "network",
			Parameters: map[string]api.ParamDef{
				"url": {Type: "string", Description: "URL to check", Required: true},
			},
		},
	}
}

func (r *Registry) RegisterDefaults() {
	for _, def := range DefaultTools() {
		r.tools[def.Name] = def
	}
}
