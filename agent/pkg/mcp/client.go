package mcp

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"os/exec"
	"sync"
)

type JSONRPCRequest struct {
	JSONRPC string `json:"jsonrpc"`
	ID      int    `json:"id"`
	Method  string `json:"method"`
	Params  any    `json:"params,omitempty"`
}

type JSONRPCResponse struct {
	JSONRPC string `json:"jsonrpc"`
	ID      int    `json:"id"`
	Result  any    `json:"result,omitempty"`
	Error   *struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

type Tool struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	InputSchema any    `json:"inputSchema"`
}

type ServerInfo struct {
	Name    string `json:"name"`
	Version string `json:"version"`
}

type MCPClient struct {
	mu         sync.Mutex
	cmd        *exec.Cmd
	stdin      io.WriteCloser
	stdout     *bufio.Scanner
	stderr     io.ReadCloser
	nextID     int
	pending    map[int]chan *JSONRPCResponse
	info       ServerInfo
	tools      []Tool
	serverName string
}

func NewClient(name string) *MCPClient {
	return &MCPClient{
		nextID:     1,
		pending:    make(map[int]chan *JSONRPCResponse),
		serverName: name,
	}
}

func (c *MCPClient) Connect(ctx context.Context, command string, args ...string) error {
	c.cmd = exec.CommandContext(ctx, command, args...)

	stdin, err := c.cmd.StdinPipe()
	if err != nil {
		return fmt.Errorf("failed to create stdin pipe: %w", err)
	}
	c.stdin = stdin

	stdout, err := c.cmd.StdoutPipe()
	if err != nil {
		return fmt.Errorf("failed to create stdout pipe: %w", err)
	}
	c.stderr, err = c.cmd.StderrPipe()
	if err != nil {
		return fmt.Errorf("failed to create stderr pipe: %w", err)
	}

	c.stdout = bufio.NewScanner(stdout)
	c.stdout.Split(bufio.ScanLines)

	if err := c.cmd.Start(); err != nil {
		return fmt.Errorf("failed to start MCP server: %w", err)
	}

	// Start reading responses
	go c.readResponses()

	// Initialize with server info request
	resp, err := c.sendRequest(ctx, "initialize", map[string]any{
		"protocolVersion": "0.1.0",
		"clientInfo": map[string]string{
			"name":    "xz-agent",
			"version": "0.1.0",
		},
	})
	if err != nil {
		return fmt.Errorf("MCP initialization failed: %w", err)
	}

	if info, ok := resp.Result.(map[string]any); ok {
		if serverInfo, ok := info["serverInfo"].(map[string]any); ok {
			c.info.Name, _ = serverInfo["name"].(string)
			c.info.Version, _ = serverInfo["version"].(string)
		}
	}

	// List available tools
	toolResp, err := c.sendRequest(ctx, "tools/list", nil)
	if err != nil {
		return fmt.Errorf("failed to list MCP tools: %w", err)
	}

	if toolResult, ok := toolResp.Result.(map[string]any); ok {
		if toolsRaw, ok := toolResult["tools"].([]any); ok {
			for _, t := range toolsRaw {
				if toolMap, ok := t.(map[string]any); ok {
					tool := Tool{
						Name:        getString(toolMap, "name"),
						Description: getString(toolMap, "description"),
						InputSchema: toolMap["inputSchema"],
					}
					c.tools = append(c.tools, tool)
				}
			}
		}
	}

	return nil
}

func (c *MCPClient) readResponses() {
	for c.stdout.Scan() {
		line := c.stdout.Text()
		var resp JSONRPCResponse
		if err := json.Unmarshal([]byte(line), &resp); err != nil {
			continue
		}

		c.mu.Lock()
		ch, ok := c.pending[resp.ID]
		c.mu.Unlock()

		if ok {
			ch <- &resp
		}
	}
}

func (c *MCPClient) sendRequest(ctx context.Context, method string, params any) (*JSONRPCResponse, error) {
	c.mu.Lock()
	id := c.nextID
	c.nextID++
	ch := make(chan *JSONRPCResponse, 1)
	c.pending[id] = ch
	c.mu.Unlock()

	defer func() {
		c.mu.Lock()
		delete(c.pending, id)
		close(ch)
		c.mu.Unlock()
	}()

	req := JSONRPCRequest{
		JSONRPC: "2.0",
		ID:      id,
		Method:  method,
		Params:  params,
	}

	data, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	data = append(data, '\n')

	c.mu.Lock()
	_, err = c.stdin.Write(data)
	c.mu.Unlock()
	if err != nil {
		return nil, fmt.Errorf("failed to write request: %w", err)
	}

	select {
	case resp := <-ch:
		if resp.Error != nil {
			return nil, fmt.Errorf("MCP error (%d): %s", resp.Error.Code, resp.Error.Message)
		}
		return resp, nil
	case <-ctx.Done():
		return nil, ctx.Err()
	}
}

func (c *MCPClient) CallTool(ctx context.Context, name string, args map[string]any) (any, error) {
	resp, err := c.sendRequest(ctx, "tools/call", map[string]any{
		"name":      name,
		"arguments": args,
	})
	if err != nil {
		return nil, err
	}
	return resp.Result, nil
}

func (c *MCPClient) GetTools() []Tool {
	return c.tools
}

func (c *MCPClient) GetServerInfo() ServerInfo {
	return c.info
}

func (c *MCPClient) Close() error {
	if c.cmd != nil && c.cmd.Process != nil {
		return c.cmd.Process.Kill()
	}
	return nil
}

func getString(m map[string]any, key string) string {
	if v, ok := m[key].(string); ok {
		return v
	}
	return ""
}
