package tool

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os/exec"
	"strings"
	"time"
	"github.com/xz-ephyr/raw-code/agent/pkg/api"
)

type Executor struct {
	registry *Registry
	expressURL string
	client     *http.Client
}

func NewExecutor(registry *Registry, expressURL string) *Executor {
	return &Executor{
		registry:   registry,
		expressURL: expressURL,
		client:     &http.Client{Timeout: 60 * time.Second},
	}
}

func (e *Executor) Execute(ctx context.Context, call api.ToolCall) api.ToolCall {
	start := time.Now()
	call.ID = fmt.Sprintf("call_%d", start.UnixMilli())

	def, ok := e.registry.Get(call.Tool)
	if !ok {
		call.Error = fmt.Sprintf("unknown tool: %s", call.Tool)
		call.Duration = time.Since(start).Milliseconds()
		return call
	}
	_ = def

	var result any
	var err error

	switch call.Tool {
	case "web_search":
		result, err = e.webSearch(ctx, call.Params)
	case "fetch_page":
		result, err = e.fetchPage(ctx, call.Params)
	case "code_search":
		result, err = e.codeSearch(ctx, call.Params)
	case "read_file":
		result, err = e.readFile(ctx, call.Params)
	case "run_command":
		result, err = e.runCommand(ctx, call.Params)
	case "list_directory":
		result, err = e.listDirectory(ctx, call.Params)
	default:
		err = fmt.Errorf("unimplemented tool: %s", call.Tool)
	}

	call.Duration = time.Since(start).Milliseconds()
	if err != nil {
		call.Error = err.Error()
	} else {
		call.Result = result
	}
	return call
}

func (e *Executor) webSearch(ctx context.Context, params map[string]any) (any, error) {
	query, _ := params["query"].(string)
	if query == "" {
		return nil, fmt.Errorf("query is required")
	}
	maxResults, _ := params["max_results"].(float64)
	if maxResults == 0 {
		maxResults = 5
	}

	body, _ := json.Marshal(map[string]any{
		"tool": "webSearch",
		"params": map[string]any{
			"query":       query,
			"maxResults":  int(maxResults),
		},
	})

	req, _ := http.NewRequestWithContext(ctx, "POST", e.expressURL+"/websearch", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := e.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("web search request failed: %w", err)
	}
	defer resp.Body.Close()

	var result any
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode web search response: %w", err)
	}
	return result, nil
}

func (e *Executor) fetchPage(ctx context.Context, params map[string]any) (any, error) {
	url, _ := params["url"].(string)
	if url == "" {
		return nil, fmt.Errorf("url is required")
	}
	format, _ := params["format"].(string)
	if format == "" {
		format = "markdown"
	}

	body, _ := json.Marshal(map[string]any{
		"tool": "fetchPage",
		"params": map[string]any{
			"url":       url,
			"extractAs": format,
		},
	})

	req, _ := http.NewRequestWithContext(ctx, "POST", e.expressURL+"/websearch", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := e.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("fetch page request failed: %w", err)
	}
	defer resp.Body.Close()

	var result any
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode fetch page response: %w", err)
	}
	return result, nil
}

func (e *Executor) codeSearch(ctx context.Context, params map[string]any) (any, error) {
	pattern, _ := params["pattern"].(string)
	if pattern == "" {
		return nil, fmt.Errorf("pattern is required")
	}
	path, _ := params["path"].(string)
	maxMatches, _ := params["max_matches"].(float64)
	if maxMatches == 0 {
		maxMatches = 20
	}

	args := []string{"-n", "--max-count", fmt.Sprintf("%d", int(maxMatches)), "-e", pattern}
	if path != "" {
		args = append(args, path)
	} else {
		args = append(args, "-r", ".")
	}

	cmd := exec.CommandContext(ctx, "rg", args...)
	var out bytes.Buffer
	cmd.Stdout = &out
	cmd.Stderr = &out

	if err := cmd.Run(); err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok && exitErr.ExitCode() == 1 {
			return map[string]any{"matches": []string{}, "count": 0}, nil
		}
		return nil, fmt.Errorf("code search failed: %w", err)
	}

	lines := strings.Split(strings.TrimSpace(out.String()), "\n")
	if len(lines) == 1 && lines[0] == "" {
		lines = []string{}
	}

	return map[string]any{
		"matches":  lines,
		"count":    len(lines),
		"pattern":  pattern,
	}, nil
}

func (e *Executor) readFile(ctx context.Context, params map[string]any) (any, error) {
	path, _ := params["path"].(string)
	if path == "" {
		return nil, fmt.Errorf("path is required")
	}

	cmd := exec.CommandContext(ctx, "cat", path)
	if strings.HasPrefix(path, "~") {
		cmd = exec.CommandContext(ctx, "sh", "-c", "cat "+path)
	}

	var out bytes.Buffer
	cmd.Stdout = &out
	cmd.Stderr = &out

	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf("read file failed: %w", err)
	}

	content := out.String()
	if offset, ok := params["offset"].(float64); ok && offset > 0 {
		lines := strings.Split(content, "\n")
		start := int(offset) - 1
		if start >= len(lines) {
			start = len(lines)
		}
		if limit, ok := params["limit"].(float64); ok && limit > 0 {
			end := start + int(limit)
			if end > len(lines) {
				end = len(lines)
			}
			content = strings.Join(lines[start:end], "\n")
		} else {
			content = strings.Join(lines[start:], "\n")
		}
	}

	return map[string]any{
		"path":    path,
		"content": content,
		"size":    len(content),
	}, nil
}

func (e *Executor) runCommand(ctx context.Context, params map[string]any) (any, error) {
	command, _ := params["command"].(string)
	if command == "" {
		return nil, fmt.Errorf("command is required")
	}
	timeoutSec, _ := params["timeout"].(float64)
	if timeoutSec == 0 {
		timeoutSec = 30
	}

	ctx, cancel := context.WithTimeout(ctx, time.Duration(timeoutSec)*time.Second)
	defer cancel()

	workdir, _ := params["workdir"].(string)

	var cmd *exec.Cmd
	if workdir != "" {
		cmd = exec.CommandContext(ctx, "sh", "-c", command)
		cmd.Dir = workdir
	} else {
		cmd = exec.CommandContext(ctx, "sh", "-c", command)
	}

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()

	result := map[string]any{
		"stdout":   stdout.String(),
		"stderr":   stderr.String(),
		"exitCode": 0,
	}

	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			result["exitCode"] = exitErr.ExitCode()
		} else {
			result["exitCode"] = -1
			result["error"] = err.Error()
		}
	}

	return result, nil
}

func (e *Executor) listDirectory(ctx context.Context, params map[string]any) (any, error) {
	path, _ := params["path"].(string)
	if path == "" {
		path = "."
	}

	args := []string{"-la", path}
	cmd := exec.CommandContext(ctx, "ls", args...)

	var out bytes.Buffer
	cmd.Stdout = &out
	cmd.Stderr = &out

	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf("list directory failed: %w", err)
	}

	lines := strings.Split(strings.TrimSpace(out.String()), "\n")

	// filter by pattern if provided
	if pattern, ok := params["pattern"].(string); ok && pattern != "" {
		rgCmd := exec.CommandContext(ctx, "rg", pattern)
		rgCmd.Stdin = strings.NewReader(out.String())
		var filtered bytes.Buffer
		rgCmd.Stdout = &filtered
		if err := rgCmd.Run(); err == nil {
			lines = strings.Split(strings.TrimSpace(filtered.String()), "\n")
		}
	}

	return map[string]any{
		"path":      path,
		"entries":   lines,
		"count":     len(lines),
	}, nil
}
