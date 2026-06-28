package tool

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	"github.com/xz-ephyr/raw-code/agent/pkg/api"
)

type Executor struct {
	registry   *Registry
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

	if _, ok := e.registry.Get(call.Tool); !ok {
		call.Error = fmt.Sprintf("unknown tool: %s", call.Tool)
		call.Duration = time.Since(start).Milliseconds()
		return call
	}

	var result any
	var err error

	switch call.Tool {
	// research
	case "web_search":
		result, err = e.webSearch(ctx, call.Params)
	case "fetch_page":
		result, err = e.fetchPage(ctx, call.Params)
	case "image_search":
		result, err = e.imageSearch(ctx, call.Params)
	case "news_search":
		result, err = e.newsSearch(ctx, call.Params)
	case "search_docs":
		result, err = e.searchDocs(ctx, call.Params)

	// code
	case "code_search":
		result, err = e.codeSearch(ctx, call.Params)
	case "read_file":
		result, err = e.readFile(ctx, call.Params)
	case "write_file":
		result, err = e.writeFile(ctx, call.Params)
	case "edit_file":
		result, err = e.editFile(ctx, call.Params)
	case "list_directory":
		result, err = e.listDirectory(ctx, call.Params)
	case "find_files":
		result, err = e.findFiles(ctx, call.Params)
	case "file_stats":
		result, err = e.fileStats(ctx, call.Params)
	case "count_lines":
		result, err = e.countLines(ctx, call.Params)
	case "grep_files":
		result, err = e.grepFiles(ctx, call.Params)

	// git
	case "git_status":
		result, err = e.gitStatus(ctx, call.Params)
	case "git_diff":
		result, err = e.gitDiff(ctx, call.Params)
	case "git_log":
		result, err = e.gitLog(ctx, call.Params)
	case "git_branches":
		result, err = e.gitBranches(ctx, call.Params)
	case "git_show":
		result, err = e.gitShow(ctx, call.Params)

	// system
	case "run_command":
		result, err = e.runCommand(ctx, call.Params)
	case "delegate_task":
		err = fmt.Errorf("delegate_task is handled by the orchestrator, not the executor")
	case "run_workflow":
		err = fmt.Errorf("run_workflow is handled by the orchestrator, not the executor")
	case "system_info":
		result, err = e.systemInfo(ctx, call.Params)
	case "list_processes":
		result, err = e.listProcesses(ctx, call.Params)
	case "resolve_path":
		result, err = e.resolvePath(ctx, call.Params)

	// network
	case "http_request":
		result, err = e.httpRequest(ctx, call.Params)
	case "check_url":
		result, err = e.checkURL(ctx, call.Params)

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

func postToExpress[T any](ctx context.Context, url string, body any) (T, error) {
	var zero T
	data, _ := json.Marshal(body)
	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(data))
	if err != nil {
		return zero, fmt.Errorf("request creation failed: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return zero, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	var result T
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return zero, fmt.Errorf("failed to decode response: %w", err)
	}
	return result, nil
}

func runCmd(ctx context.Context, name string, args ...string) (string, error) {
	var out bytes.Buffer
	cmd := exec.CommandContext(ctx, name, args...)
	cmd.Stdout = &out
	cmd.Stderr = &out
	if err := cmd.Run(); err != nil {
		return "", fmt.Errorf("%s failed: %w\n%s", name, err, out.String())
	}
	return out.String(), nil
}

// ── Research Tools ─────────────────────────────────────────────────

func (e *Executor) webSearch(ctx context.Context, params map[string]any) (any, error) {
	query, _ := params["query"].(string)
	if query == "" {
		return nil, fmt.Errorf("query is required")
	}
	maxResults, _ := params["max_results"].(float64)
	if maxResults == 0 {
		maxResults = 5
	}

	reqParams := map[string]any{
		"query":      query,
		"maxResults": int(maxResults),
	}
	if site, ok := params["site"].(string); ok && site != "" {
		reqParams["site"] = site
	}

	return postToExpress[any](ctx, e.expressURL+"/websearch", map[string]any{
		"tool":   "webSearch",
		"params": reqParams,
	})
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

	return postToExpress[any](ctx, e.expressURL+"/websearch", map[string]any{
		"tool": "fetchPage",
		"params": map[string]any{
			"url":       url,
			"extractAs": format,
		},
	})
}

func (e *Executor) imageSearch(ctx context.Context, params map[string]any) (any, error) {
	query, _ := params["query"].(string)
	if query == "" {
		return nil, fmt.Errorf("query is required")
	}
	maxResults, _ := params["max_results"].(float64)
	if maxResults == 0 {
		maxResults = 5
	}
	safeSearch := true
	if v, ok := params["safe_search"].(bool); ok {
		safeSearch = v
	}

	return postToExpress[any](ctx, e.expressURL+"/websearch", map[string]any{
		"tool": "imageSearch",
		"params": map[string]any{
			"query":      query,
			"maxResults": int(maxResults),
			"safeSearch": safeSearch,
		},
	})
}

func (e *Executor) newsSearch(ctx context.Context, params map[string]any) (any, error) {
	query, _ := params["query"].(string)
	if query == "" {
		return nil, fmt.Errorf("query is required")
	}
	maxResults, _ := params["max_results"].(float64)
	if maxResults == 0 {
		maxResults = 5
	}
	freshness, _ := params["freshness"].(string)
	if freshness == "" {
		freshness = "week"
	}

	return postToExpress[any](ctx, e.expressURL+"/websearch", map[string]any{
		"tool": "newsSearch",
		"params": map[string]any{
			"query":      query,
			"maxResults": int(maxResults),
			"freshness":  freshness,
		},
	})
}

func (e *Executor) searchDocs(ctx context.Context, params map[string]any) (any, error) {
	query, _ := params["query"].(string)
	if query == "" {
		return nil, fmt.Errorf("query is required")
	}
	library, _ := params["library"].(string)

	fullQuery := query
	if library != "" {
		fullQuery = library + " " + query
	}

	return e.webSearch(ctx, map[string]any{
		"query":       fullQuery + " documentation",
		"max_results": 5,
	})
}

// ── Code Tools ─────────────────────────────────────────────────────

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

	if fp, ok := params["file_glob"].(string); ok && fp != "" {
		args = append(args, "--glob", fp)
	}

	if path != "" {
		args = append(args, path)
	} else {
		args = append(args, "-r", ".")
	}

	out, err := runCmd(ctx, "rg", args...)
	if err != nil {
		if strings.Contains(err.Error(), "exit status 1") {
			return map[string]any{"matches": []string{}, "count": 0, "pattern": pattern}, nil
		}
		return nil, err
	}

	lines := strings.Split(strings.TrimSpace(out), "\n")
	if len(lines) == 1 && lines[0] == "" {
		lines = []string{}
	}

	return map[string]any{
		"matches": lines,
		"count":   len(lines) - 1,
		"pattern": pattern,
	}, nil
}

func (e *Executor) readFile(ctx context.Context, params map[string]any) (any, error) {
	path, _ := params["path"].(string)
	if path == "" {
		return nil, fmt.Errorf("path is required")
	}

	content, err := runCmd(ctx, "cat", path)
	if err != nil {
		return nil, fmt.Errorf("read file failed: %w", err)
	}

	lines := strings.Split(content, "\n")
	if offset, ok := params["offset"].(float64); ok && offset > 0 {
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
		"lines":   len(lines),
	}, nil
}

func (e *Executor) writeFile(ctx context.Context, params map[string]any) (any, error) {
	path, _ := params["path"].(string)
	if path == "" {
		return nil, fmt.Errorf("path is required")
	}
	content, _ := params["content"].(string)

	dir := filepath.Dir(path)
	if dir != "." {
		if err := os.MkdirAll(dir, 0755); err != nil {
			return nil, fmt.Errorf("failed to create parent directories: %w", err)
		}
	}

	if err := os.WriteFile(path, []byte(content), 0644); err != nil {
		return nil, fmt.Errorf("failed to write file: %w", err)
	}

	return map[string]any{
		"path":    path,
		"size":    len(content),
		"status":  "written",
	}, nil
}

func (e *Executor) editFile(ctx context.Context, params map[string]any) (any, error) {
	path, _ := params["path"].(string)
	if path == "" {
		return nil, fmt.Errorf("path is required")
	}
	oldStr, _ := params["old_string"].(string)
	if oldStr == "" {
		return nil, fmt.Errorf("old_string is required")
	}
	newStr, _ := params["new_string"].(string)

	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("failed to read file: %w", err)
	}

	content := string(data)
	count := strings.Count(content, oldStr)
	if count == 0 {
		return nil, fmt.Errorf("old_string not found in file: %s", path)
	}

	newContent := strings.Replace(content, oldStr, newStr, 1)

	if err := os.WriteFile(path, []byte(newContent), 0644); err != nil {
		return nil, fmt.Errorf("failed to write edited file: %w", err)
	}

	return map[string]any{
		"path":       path,
		"replaced":   count,
		"status":     "edited",
	}, nil
}

func (e *Executor) listDirectory(ctx context.Context, params map[string]any) (any, error) {
	path, _ := params["path"].(string)
	if path == "" {
		path = "."
	}

	entries, err := os.ReadDir(path)
	if err != nil {
		return nil, fmt.Errorf("list directory failed: %w", err)
	}

	var result []map[string]any
	for _, entry := range entries {
		info, _ := entry.Info()
		size := int64(0)
		mode := ""
		modTime := ""
		if info != nil {
			size = info.Size()
			mode = info.Mode().String()
			modTime = info.ModTime().Format(time.RFC3339)
		}
		result = append(result, map[string]any{
			"name":     entry.Name(),
			"is_dir":   entry.IsDir(),
			"size":     size,
			"mode":     mode,
			"modified": modTime,
		})
	}

	if pattern, ok := params["pattern"].(string); ok && pattern != "" {
		var filtered []map[string]any
		for _, entry := range result {
			if matched, _ := filepath.Match(pattern, entry["name"].(string)); matched {
				filtered = append(filtered, entry)
			}
		}
		result = filtered
	}

	return map[string]any{
		"path":    path,
		"entries": result,
		"count":   len(result),
	}, nil
}

func (e *Executor) findFiles(ctx context.Context, params map[string]any) (any, error) {
	pattern, _ := params["pattern"].(string)
	if pattern == "" {
		return nil, fmt.Errorf("pattern is required")
	}
	root, _ := params["root"].(string)
	if root == "" {
		root = "."
	}
	maxResults, _ := params["max_results"].(float64)
	if maxResults == 0 {
		maxResults = 50
	}

	var matches []string
	walkErr := filepath.Walk(root, func(fp string, info os.FileInfo, err error) error {
		if err != nil {
			return nil
		}
		if len(matches) >= int(maxResults) {
			return filepath.SkipAll
		}
		matched, _ := filepath.Match(pattern, info.Name())
		if matched {
			matches = append(matches, fp)
		}
		return nil
	})
	if walkErr != nil {
		return nil, fmt.Errorf("find failed: %w", walkErr)
	}

	return map[string]any{
		"pattern": pattern,
		"root":    root,
		"matches": matches,
		"count":   len(matches),
	}, nil
}

func (e *Executor) fileStats(ctx context.Context, params map[string]any) (any, error) {
	path, _ := params["path"].(string)
	if path == "" {
		return nil, fmt.Errorf("path is required")
	}

	info, err := os.Stat(path)
	if err != nil {
		return nil, fmt.Errorf("stat failed: %w", err)
	}

	result := map[string]any{
		"path":         path,
		"name":         info.Name(),
		"size":         info.Size(),
		"is_dir":       info.IsDir(),
		"mode":         info.Mode().String(),
		"modified":     info.ModTime().Format(time.RFC3339),
		"permissions":  info.Mode().Perm(),
	}

	if !info.IsDir() {
		linesOut, err := runCmd(ctx, "wc", "-l", path)
		if err == nil {
			parts := strings.Fields(linesOut)
			if len(parts) > 0 {
				result["lines"] = strings.TrimSpace(parts[0])
			}
		}
	}

	return result, nil
}

func (e *Executor) countLines(ctx context.Context, params map[string]any) (any, error) {
	path, _ := params["path"].(string)
	if path == "" {
		path = "."
	}
	ext, _ := params["ext"].(string)
	exclude, _ := params["exclude"].(string)
	if exclude == "" {
		exclude = "node_modules,dist,.git,.next,build"
	}

	args := []string{"--type-add", "all:*"}
	if ext != "" {
		for _, e := range strings.Split(ext, ",") {
			e = strings.TrimSpace(e)
			if e != "" {
				args = append(args, "--include", "*."+e)
			}
		}
	} else {
		args = append(args, "--include", "*.go", "--include", "*.ts", "--include", "*.tsx",
			"--include", "*.js", "--include", "*.jsx", "--include", "*.py",
			"--include", "*.rs", "--include", "*.java", "--include", "*.rb",
			"--include", "*.cs", "--include", "*.swift", "--include", "*.kt",
			"--include", "*.c", "--include", "*.h", "--include", "*.cpp",
			"--include", "*.hpp", "--include", "*.css", "--include", "*.scss",
			"--include", "*.html", "--include", "*.md", "--include", "*.yml",
			"--include", "*.yaml", "--include", "*.json", "--include", "*.toml",
			"--include", "*.sql", "--include", "*.sh", "--include", "*.tf")
	}

	for _, d := range strings.Split(exclude, ",") {
		d = strings.TrimSpace(d)
		if d != "" {
			args = append(args, "--exclude-dir", d)
		}
	}

	args = append(args, path)

	out, err := runCmd(ctx, "cloc", args...)
	if err != nil {
		// fallback: use wc -l on all files via find
		findArgs := []string{path, "-type", "f"}
		if ext != "" {
			for _, e := range strings.Split(ext, ",") {
				e = strings.TrimSpace(e)
				if e != "" {
					findArgs = append(findArgs, "-name", "*."+e, "-o")
				}
			}
			if len(findArgs) > 3 {
				findArgs = findArgs[:len(findArgs)-1]
			}
		}
		findOut, findErr := runCmd(ctx, "find", findArgs...)
		if findErr != nil {
			return map[string]any{"error": "no line counter available", "path": path}, nil
		}
		files := strings.Split(strings.TrimSpace(findOut), "\n")
		totalLines := 0
		for _, f := range files {
			if f == "" {
				continue
			}
			if wcOut, wcErr := runCmd(ctx, "wc", "-l", f); wcErr == nil {
				parts := strings.Fields(wcOut)
				if len(parts) > 0 {
					var n int
					fmt.Sscanf(parts[0], "%d", &n)
					totalLines += n
				}
			}
		}
		return map[string]any{"path": path, "total_lines": totalLines, "file_count": len(files)}, nil
	}

	return map[string]any{
		"path":  path,
		"cloc":  out,
	}, nil
}

func (e *Executor) grepFiles(ctx context.Context, params map[string]any) (any, error) {
	query, _ := params["query"].(string)
	if query == "" {
		return nil, fmt.Errorf("query is required")
	}
	searchPath, _ := params["path"].(string)
	if searchPath == "" {
		searchPath = "."
	}
	maxMatches, _ := params["max_matches"].(float64)
	if maxMatches == 0 {
		maxMatches = 30
	}

	args := []string{"-n", "-i", "--max-count", fmt.Sprintf("%d", int(maxMatches)), "-e", query}
	if fp, ok := params["file_glob"].(string); ok && fp != "" {
		args = append(args, "--glob", fp)
	}
	args = append(args, "-r", searchPath)

	out, err := runCmd(ctx, "rg", args...)
	if err != nil {
		if strings.Contains(err.Error(), "exit status 1") {
			return map[string]any{"matches": []string{}, "count": 0, "query": query}, nil
		}
		return nil, err
	}

	lines := strings.Split(strings.TrimSpace(out), "\n")
	if len(lines) == 1 && lines[0] == "" {
		lines = []string{}
	}

	return map[string]any{
		"matches": lines,
		"count":   len(lines),
		"query":   query,
	}, nil
}

// ── Git Tools ──────────────────────────────────────────────────────

func (e *Executor) git(ctx context.Context, repoPath string, args ...string) (string, error) {
	cmdArgs := append([]string{"-C", repoPath}, args...)
	return runCmd(ctx, "git", cmdArgs...)
}

func (e *Executor) gitStatus(ctx context.Context, params map[string]any) (any, error) {
	path, _ := params["path"].(string)
	if path == "" {
		path = "."
	}
	out, err := e.git(ctx, path, "status", "--short", "--branch")
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"path":   path,
		"output": out,
	}, nil
}

func (e *Executor) gitDiff(ctx context.Context, params map[string]any) (any, error) {
	path, _ := params["path"].(string)
	if path == "" {
		path = "."
	}
	args := []string{"diff"}
	if staged, ok := params["staged"].(bool); ok && staged {
		args = append(args, "--staged")
	}
	if filename, ok := params["filename"].(string); ok && filename != "" {
		args = append(args, "--", filename)
	}
	out, err := e.git(ctx, path, args...)
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"path":   path,
		"output": out,
	}, nil
}

func (e *Executor) gitLog(ctx context.Context, params map[string]any) (any, error) {
	path, _ := params["path"].(string)
	if path == "" {
		path = "."
	}
	count, _ := params["count"].(float64)
	if count == 0 {
		count = 10
	}
	out, err := e.git(ctx, path,
		"log", fmt.Sprintf("--max-count=%d", int(count)),
		"--pretty=format:%h %ai %an: %s",
	)
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"path":   path,
		"count":  int(count),
		"output": out,
	}, nil
}

func (e *Executor) gitBranches(ctx context.Context, params map[string]any) (any, error) {
	path, _ := params["path"].(string)
	if path == "" {
		path = "."
	}
	args := []string{"branch"}
	if remote, ok := params["remote"].(bool); ok && remote {
		args = append(args, "-a")
	}
	out, err := e.git(ctx, path, args...)
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"path":   path,
		"output": out,
	}, nil
}

func (e *Executor) gitShow(ctx context.Context, params map[string]any) (any, error) {
	path, _ := params["path"].(string)
	if path == "" {
		path = "."
	}
	commit, _ := params["commit"].(string)
	if commit == "" {
		return nil, fmt.Errorf("commit is required")
	}
	out, err := e.git(ctx, path, "show", "--stat", "--pretty=fuller", commit)
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"path":   path,
		"commit": commit,
		"output": out,
	}, nil
}

// ── System Tools ───────────────────────────────────────────────────

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

func (e *Executor) systemInfo(ctx context.Context, params map[string]any) (any, error) {
	detail, _ := params["detail"].(string)
	if detail == "" {
		detail = "basic"
	}

	hostname, _ := os.Hostname()
	cwd, _ := os.Getwd()

	info := map[string]any{
		"hostname":  hostname,
		"os":        runtime.GOOS,
		"arch":      runtime.GOARCH,
		"go_version": runtime.Version(),
		"cpu_cores": runtime.NumCPU(),
		"cwd":       cwd,
	}

	if detail == "full" {
		diskOut, _ := runCmd(ctx, "df", "-h", "/")
		memOut, _ := runCmd(ctx, "free", "-h")
		uptimeOut, _ := runCmd(ctx, "uptime")
		info["disk"] = diskOut
		info["memory"] = memOut
		info["uptime"] = uptimeOut
	}

	return info, nil
}

func (e *Executor) listProcesses(ctx context.Context, params map[string]any) (any, error) {
	max, _ := params["max"].(float64)
	if max == 0 {
		max = 30
	}
	filter, _ := params["filter"].(string)

	var out string
	var err error
	if runtime.GOOS == "windows" {
		out, err = runCmd(ctx, "tasklist", "/FO", "CSV", "/NH")
	} else {
		psArgs := fmt.Sprintf("aux --sort=-%%mem | head -%d", int(max))
		if filter != "" {
			psArgs = fmt.Sprintf("aux | grep -i %s | head -%d", filter, int(max))
		}
		out, err = runCmd(ctx, "sh", "-c", "ps "+psArgs)
	}
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"processes": out,
		"count":     len(strings.Split(strings.TrimSpace(out), "\n")),
	}, nil
}

func (e *Executor) resolvePath(ctx context.Context, params map[string]any) (any, error) {
	path, _ := params["path"].(string)
	if path == "" {
		return nil, fmt.Errorf("path is required")
	}

	expanded := os.ExpandEnv(path)
	if strings.HasPrefix(expanded, "~") {
		home, _ := os.UserHomeDir()
		expanded = filepath.Join(home, expanded[1:])
	}

	abs, err := filepath.Abs(expanded)
	if err != nil {
		return nil, fmt.Errorf("failed to resolve path: %w", err)
	}

	real, err := filepath.EvalSymlinks(abs)
	if err != nil {
		real = abs
	}

	info, err := os.Stat(real)
	exists := err == nil

	return map[string]any{
		"original":  path,
		"expanded":  expanded,
		"absolute":  abs,
		"canonical": real,
		"exists":    exists,
		"is_dir":    exists && info.IsDir(),
	}, nil
}

// ── Network Tools ──────────────────────────────────────────────────

func (e *Executor) httpRequest(ctx context.Context, params map[string]any) (any, error) {
	url, _ := params["url"].(string)
	if url == "" {
		return nil, fmt.Errorf("url is required")
	}
	method, _ := params["method"].(string)
	if method == "" {
		method = "GET"
	}
	timeoutSec, _ := params["timeout"].(float64)
	if timeoutSec == 0 {
		timeoutSec = 15
	}

	bodyStr, _ := params["body"].(string)
	var bodyReader io.Reader
	if bodyStr != "" {
		bodyReader = strings.NewReader(bodyStr)
	}

	ctx, cancel := context.WithTimeout(ctx, time.Duration(timeoutSec)*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, method, url, bodyReader)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	if headersStr, ok := params["headers"].(string); ok && headersStr != "" {
		var headers map[string]string
		if err := json.Unmarshal([]byte(headersStr), &headers); err == nil {
			for k, v := range headers {
				req.Header.Set(k, v)
			}
		}
	}

	start := time.Now()
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(io.LimitReader(resp.Body, 1024*512))

	return map[string]any{
		"url":          url,
		"status_code":  resp.StatusCode,
		"status":       resp.Status,
		"content_type": resp.Header.Get("Content-Type"),
		"body":         string(respBody),
		"body_size":    len(respBody),
		"duration_ms":  time.Since(start).Milliseconds(),
		"headers":      resp.Header,
	}, nil
}

func (e *Executor) checkURL(ctx context.Context, params map[string]any) (any, error) {
	url, _ := params["url"].(string)
	if url == "" {
		return nil, fmt.Errorf("url is required")
	}

	start := time.Now()
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, "HEAD", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		// try GET if HEAD fails
		req2, _ := http.NewRequestWithContext(ctx, "GET", url, nil)
		resp, err = http.DefaultClient.Do(req2)
		if err != nil {
			return nil, fmt.Errorf("URL unreachable: %w", err)
		}
	}
	defer resp.Body.Close()

	return map[string]any{
		"url":          url,
		"reachable":    true,
		"status_code":  resp.StatusCode,
		"content_type": resp.Header.Get("Content-Type"),
		"response_ms":  time.Since(start).Milliseconds(),
	}, nil
}
