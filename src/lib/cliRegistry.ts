import type { CLIDefinition } from '../types/cli';

export const KNOWN_CLIS: CLIDefinition[] = [
  {
    id: 'opencode',
    name: 'OpenCode',
    binary: 'opencode',
    provider: 'opencode',
    capabilities: [
      { type: 'code_gen', confidence: 0.9, modelIds: ['deepseek-v4-flash-free', 'mimo-v2.5-free', 'big-pickle'] },
      { type: 'reasoning', confidence: 0.9, modelIds: ['deepseek-v4-flash-free'] },
      { type: 'shell_exec', confidence: 0.8, modelIds: ['deepseek-v4-flash-free'] },
      { type: 'web_search', confidence: 0.7, modelIds: ['big-pickle'] },
      { type: 'vision', confidence: 0.6, modelIds: ['mimo-v2.5-free'] },
    ],
    configPaths: ['~/.config/opencode/config.json'],
    serverUrl: 'http://localhost:3080',
  },
  {
    id: 'codex',
    name: 'Codex CLI',
    binary: 'codex',
    provider: 'openai',
    capabilities: [
      { type: 'code_gen', confidence: 0.95, modelIds: ['gpt-4o', 'gpt-4o-mini'] },
      { type: 'code_review', confidence: 0.9, modelIds: ['gpt-4o'] },
      { type: 'file_edit', confidence: 0.85, modelIds: ['gpt-4o'] },
    ],
    configPaths: ['~/.codex/config.toml'],
  },
  {
    id: 'claude',
    name: 'Claude Code',
    binary: 'claude',
    provider: 'anthropic',
    capabilities: [
      { type: 'code_gen', confidence: 0.9, modelIds: ['claude-sonnet-4', 'claude-haiku-3'] },
      { type: 'reasoning', confidence: 0.85, modelIds: ['claude-sonnet-4'] },
      { type: 'file_edit', confidence: 0.8, modelIds: ['claude-sonnet-4'] },
      { type: 'vision', confidence: 0.7, modelIds: ['claude-sonnet-4'] },
    ],
    configPaths: ['~/.claude/settings.json'],
  },
  {
    id: 'aider',
    name: 'Aider',
    binary: 'aider',
    provider: 'aider',
    capabilities: [
      { type: 'file_edit', confidence: 0.95, modelIds: ['aider-default'] },
      { type: 'code_gen', confidence: 0.8, modelIds: ['aider-default'] },
      { type: 'git_ops', confidence: 0.9, modelIds: ['aider-default'] },
    ],
    configPaths: ['~/.aider.conf.yml'],
  },
  {
    id: 'agy',
    name: 'Antigravity CLI',
    binary: 'agy',
    provider: 'google',
    capabilities: [
      { type: 'code_gen', confidence: 0.85, modelIds: ['gemini-3.5-flash', 'gemini-3-flash-preview'] },
      { type: 'reasoning', confidence: 0.8, modelIds: ['gemini-3.5-flash'] },
      { type: 'shell_exec', confidence: 0.9, modelIds: ['gemini-3.5-flash'] },
    ],
    configPaths: ['~/.gemini/antigravity-cli/settings.json'],
  },
];
