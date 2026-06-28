package infra

import (
	"bytes"
	"fmt"
	"os/exec"
	"runtime"
	"strings"
)

type TauriShell struct{}

func NewTauriShell() *TauriShell {
	return &TauriShell{}
}

// FindBinary locates a binary on the system PATH (equivalent to which/where)
func (s *TauriShell) FindBinary(name string) (string, error) {
	var cmd string
	var args []string

	if runtime.GOOS == "windows" {
		cmd = "where"
		args = []string{name}
	} else {
		cmd = "which"
		args = []string{name}
	}

	var out bytes.Buffer
	c := exec.Command(cmd, args...)
	c.Stdout = &out

	if err := c.Run(); err != nil {
		return "", fmt.Errorf("binary %q not found: %w", name, err)
	}

	path := strings.TrimSpace(out.String())
	lines := strings.Split(path, "\n")
	return lines[0], nil
}

// GetVersion runs <binary> --version and returns the first line
func (s *TauriShell) GetVersion(binary string) (string, error) {
	var out bytes.Buffer
	c := exec.Command(binary, "--version")
	c.Stdout = &out

	if err := c.Run(); err != nil {
		return "", fmt.Errorf("failed to get version for %q: %w", binary, err)
	}

	version := strings.TrimSpace(out.String())
	lines := strings.Split(version, "\n")
	return lines[0], nil
}

// DetectCLIs checks which AI coding CLIs are installed
func (s *TauriShell) DetectCLIs() map[string]string {
	clis := []string{"codex", "agy", "claude", "opencode", "gemini", "aider", "kiro"}
	result := make(map[string]string)

	for _, cli := range clis {
		if path, err := s.FindBinary(cli); err == nil {
			version, _ := s.GetVersion(cli)
			entry := path
			if version != "" {
				entry = path + " (" + version + ")"
			}
			result[cli] = entry
		}
	}

	return result
}

// CLIInfo returns detailed info about a detected CLI
type CLIInfo struct {
	Name     string `json:"name"`
	Binary   string `json:"binary"`
	Path     string `json:"path"`
	Version  string `json:"version,omitempty"`
	Detected bool   `json:"detected"`
}

func (s *TauriShell) GetCLIInfo(name string) *CLIInfo {
	info := &CLIInfo{Name: name, Binary: name}

	path, err := s.FindBinary(name)
	if err != nil {
		info.Detected = false
		return info
	}

	info.Path = path
	info.Detected = true
	version, err := s.GetVersion(name)
	if err == nil {
		info.Version = version
	}

	return info
}
