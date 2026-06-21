export type Provider =
  | 'google'
  | 'groq'
  | 'mistral'
  | 'openrouter'
  | 'cerebras'
  | 'opencodezen';

export interface ModelDefinition {
  id: string;
  provider: Provider;
  label: string;
  supportsThinking?: boolean;
}

export const ALLOWED_PROVIDERS: Provider[] = [
  'google', 'groq', 'opencodezen', 'mistral', 'openrouter', 'cerebras',
];

export const MODELS: ModelDefinition[] = [
  // Google (untouched)
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

  // OpenCode Zen
  { id: 'deepseek-v4-flash-free', provider: 'opencodezen', label: 'DeepSeek V4 Flash Free' },
  { id: 'big-pickle', provider: 'opencodezen', label: 'Big Pickle' },
  { id: 'mimo-v2.5-free', provider: 'opencodezen', label: 'Mimo v2.5 Free' },

  // Mistral
  { id: 'mistral-large-latest', provider: 'mistral', label: 'Mistral Large' },
  { id: 'mistral-medium-latest', provider: 'mistral', label: 'Mistral Medium' },
  { id: 'mistral-small-latest', provider: 'mistral', label: 'Mistral Small' },
  { id: 'magistral-medium-latest', provider: 'mistral', label: 'Magistral Medium' },
  { id: 'devstral-latest', provider: 'mistral', label: 'Devstral' },
  { id: 'codestral-latest', provider: 'mistral', label: 'Codestral' },

  // OpenRouter (:free models)
  { id: 'openrouter/owl-alpha', provider: 'openrouter', label: 'OWL Alpha' },
  { id: 'nvidia/nemotron-3-ultra-550b-a55b:free', provider: 'openrouter', label: 'Nemotron 3 Ultra 550B (free)' },
  { id: 'nousresearch/hermes-3-llama-3.1-405b:free', provider: 'openrouter', label: 'Hermes 3 405B (free)' },
  { id: 'google/gemma-4-26b-a4b-it:free', provider: 'openrouter', label: 'Gemma 4 26B (free)' },
  { id: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free', provider: 'openrouter', label: 'Nemotron Nano 30B Reasoning (free)' },
  { id: 'cognitivecomputations/dolphin-mistral-24b-venice-edition:free', provider: 'openrouter', label: 'Dolphin Mistral 24B (free)' },
  { id: 'nvidia/nemotron-nano-12b-v2-vl:free', provider: 'openrouter', label: 'Nemotron Nano 12B VL (free)' },
  { id: 'poolside/laguna-xs.2:free', provider: 'openrouter', label: 'Laguna XS (free)' },
  { id: 'nvidia/nemotron-nano-9b-v2:free', provider: 'openrouter', label: 'Nemotron Nano 9B (free)' },
  { id: 'liquid/lfm-2.5-1.2b-instruct:free', provider: 'openrouter', label: 'LFM 2.5 1.2B Instruct (free)' },
  { id: 'liquid/lfm-2.5-1.2b-thinking:free', provider: 'openrouter', label: 'LFM 2.5 1.2B Thinking (free)' },
  { id: 'meta-llama/llama-3.2-3b-instruct:free', provider: 'openrouter', label: 'Llama 3.2 3B (free)' },

  // Cerebras
  { id: 'gpt-oss-120b', provider: 'cerebras', label: 'GPT OSS 120B' },
  { id: 'llama-3-3-70b', provider: 'cerebras', label: 'Llama 3.3 70B' },
  { id: 'llama4-scout-17b-16e-instruct', provider: 'cerebras', label: 'Llama 4 Scout' },
  { id: 'qwen-3-32b', provider: 'cerebras', label: 'Qwen 3 32B' },
  { id: 'deepSeek-r1-distill-llama-70B', provider: 'cerebras', label: 'DeepSeek R1 Distill 70B' },
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
  openrouter: 'openrouter-api-key',
  cerebras: 'cerebras-api-key',
  opencodezen: 'opencodezen-api-key',
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
