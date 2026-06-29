export interface CLICapability {
  type: 'code_review' | 'file_edit' | 'git_ops' | 'code_gen' | 'shell_exec' | 'web_search' | 'reasoning' | 'vision';
  confidence: number;
  modelIds: string[];
}

export interface CLIDefinition {
  id: string;
  name: string;
  binary: string;
  provider: string;
  capabilities: CLICapability[];
  configPaths: string[];
  serverUrl?: string;
  authCheckCommand?: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  free: boolean;
  provider: string;
  source: 'cli';
  cliId: string;
}

export interface CommandResult {
  success: boolean;
  output?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface AuthStatus {
  authenticated: boolean;
  method?: string;
  token?: string;
}

export interface CLIStreamEvent {
  type: 'token' | 'diff' | 'progress' | 'error' | 'done' | 'tool_call';
  data: unknown;
  timestamp: number;
}

export interface CLIBridge {
  id: string;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  execute(command: string, args?: string[]): Promise<CommandResult>;
  getModels(): Promise<ModelInfo[]>;
  getAuthStatus(): Promise<AuthStatus>;
}
