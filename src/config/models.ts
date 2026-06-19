export type Provider =
  | 'google'
  | 'groq'
  | 'mistral'
  | 'openai'
  | 'openrouter'
  | 'cerebras'
  | 'opencodezen'
  | 'github'
  | 'cloudflare'
  | 'cohere'
  | 'zai'
  | 'nvidia'
  | 'huggingface'
  | 'ollama'
  | 'kilo'
  | 'pollinations'
  | 'llm7'
  | 'ovh'
  | 'reka';

export interface ModelDefinition {
  id: string;
  provider: Provider;
  label: string;
  supportsThinking?: boolean;
}

export const ALLOWED_PROVIDERS: Provider[] = ['google', 'groq'];

export const MODELS: ModelDefinition[] = [
  // Google
  { id: 'gemini-3.5-flash', provider: 'google', label: 'Gemini 3.5 Flash' },
  { id: 'gemini-3-flash-preview', provider: 'google', label: 'Gemini 3 Flash Preview' },
  { id: 'gemma-4-31b-it', provider: 'google', label: 'Gemma 4 31B IT' },
  { id: 'gemini-2.5-flash', provider: 'google', label: 'Gemini 2.5 Flash' },
  { id: 'gemma-4-26b-a4b-it', provider: 'google', label: 'Gemma 4 26B A4B IT' },
  { id: 'gemini-2.5-flash-lite', provider: 'google', label: 'Gemini 2.5 Flash Lite' },

  // Groq
  { id: 'groq/compound', provider: 'groq', label: 'Compound (Groq)' },
  { id: 'groq/compound-mini', provider: 'groq', label: 'Compound Mini (Groq)' },
  { id: 'qwen/qwen3-32b', provider: 'groq', label: 'Qwen 3 32B (Groq)' },
  { id: 'llama-3.1-8b-instant', provider: 'groq', label: 'Llama 3.1 8B (Groq)' },
  { id: 'openai/gpt-oss-safeguard-20b', provider: 'groq', label: 'GPT OSS Safeguard 20B (Groq)' },
];

export const AI_MODELS = MODELS.map(m => m.id);
export type AIModel = string;

export const DEFAULT_MODEL: AIModel = 'gemini-3.5-flash';

export const THINKING_MODELS = MODELS.filter(m => m.supportsThinking).map(m => m.id);

export const MODEL_MODES = {
  fixed: 'fixed',
  rotate: 'rotate',
} as const;

export type ModelMode = (typeof MODEL_MODES)[keyof typeof MODEL_MODES];

export const MODEL_MODE_STORAGE_KEY = 'model-mode';
export const SELECTED_MODEL_STORAGE_KEY = 'selected-model';

// API Key Storage Keys
export const API_KEYS = {
  google: 'api-key',
  groq: 'groq-api-key',
  mistral: 'mistral-api-key',
  openai: 'openai-api-key',
  openrouter: 'openrouter-api-key',
  cerebras: 'cerebras-api-key',
  opencodezen: 'opencodezen-api-key',
  github: 'github-api-key',
  cloudflare: 'cloudflare-api-key',
  cohere: 'cohere-api-key',
  zai: 'zai-api-key',
  nvidia: 'nvidia-api-key',
  huggingface: 'huggingface-api-key',
  ollama: 'ollama-api-key',
  kilo: 'kilo-api-key',
  pollinations: 'pollinations-api-key',
  llm7: 'llm7-api-key',
  ovh: 'ovh-api-key',
  reka: 'reka-api-key',
  gateway: 'gateway-url',
} as const;

export function isAIModel(model: string | null): model is AIModel {
  return AI_MODELS.includes(model as string);
}

export function isModelMode(mode: string | null): mode is ModelMode {
  return mode === MODEL_MODES.fixed || mode === MODEL_MODES.rotate;
}

export function getStoredSelectedModel(): AIModel {
  const storedModel = localStorage.getItem(SELECTED_MODEL_STORAGE_KEY);
  return isAIModel(storedModel) ? storedModel : DEFAULT_MODEL;
}

export function getStoredModelMode(): ModelMode {
  const storedMode = localStorage.getItem(MODEL_MODE_STORAGE_KEY);
  return isModelMode(storedMode) ? storedMode : MODEL_MODES.fixed;
}

export function getModelRotationStorageKey(sessionId: string | undefined): string {
  return `model-rotation-index-${sessionId || 'new'}`;
}

export function getNextRotatingModel(sessionId: string | undefined): AIModel {
  const storageKey = getModelRotationStorageKey(sessionId);
  const storedIndex = parseInt(localStorage.getItem(storageKey) || '0', 10);
  const currentIndex = isNaN(storedIndex) ? 0 : storedIndex % AI_MODELS.length;
  const nextIndex = (currentIndex + 1) % AI_MODELS.length;

  localStorage.setItem(storageKey, nextIndex.toString());

  return AI_MODELS[currentIndex];
}

export function getModelForChatRequest(sessionId: string | undefined): AIModel {
  return getStoredModelMode() === MODEL_MODES.rotate
    ? getNextRotatingModel(sessionId)
    : getStoredSelectedModel();
}

export function getModelDefinition(modelId: string): ModelDefinition | undefined {
  return MODELS.find(m => m.id === modelId);
}
