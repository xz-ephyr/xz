# Technical Implementation Guide
## Production-Ready Architecture for All Planned Features

> Stack baseline: Tauri 2.x · Rust backend · Vite + React + TypeScript frontend
> Every decision here is made for production stability, not prototyping convenience.

---

## F1 · Multi-Modal Model Support

### Goal
A single unified model router that can send requests to any provider — Anthropic,
Google Gemini, OpenAI-compatible — and handle text, vision, and embedding workloads
through one consistent internal interface.

### Architecture

```
Frontend (React)
    │
    ▼
ModelRouter (Rust — Tauri command layer)
    ├── AnthropicAdapter   → api.anthropic.com
    ├── GeminiAdapter      → generativelanguage.googleapis.com
    ├── OpenAIAdapter      → api.openai.com (or any compatible endpoint)
    └── LocalAdapter       → localhost:11434 (Ollama — see F2)
         │
         ▼
    EmbeddingPipeline
         │
         ▼
    VectorStore (LanceDB local / Supabase pgvector remote)
```

### Rust Implementation

**Cargo.toml dependencies:**
```toml
reqwest = { version = "0.12", features = ["json", "stream"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tokio = { version = "1", features = ["full"] }
async-trait = "0.1"
lancedb = "0.8"          # local vector store
tiktoken-rs = "0.5"      # token counting
```

**Core trait — every provider implements this:**
```rust
#[async_trait]
pub trait ModelAdapter: Send + Sync {
    async fn complete(&self, req: CompletionRequest) 
        -> Result<CompletionResponse, ModelError>;
    
    async fn embed(&self, texts: Vec<String>) 
        -> Result<Vec<Vec<f32>>, ModelError>;
    
    async fn stream(
        &self, 
        req: CompletionRequest,
        tx: mpsc::Sender<StreamChunk>,
    ) -> Result<(), ModelError>;
    
    fn supports_vision(&self) -> bool;
    fn context_window(&self) -> usize;
    fn model_id(&self) -> &str;
}
```

**Unified request shape:**
```rust
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CompletionRequest {
    pub messages: Vec<Message>,
    pub model_override: Option<String>,
    pub max_tokens: Option<u32>,
    pub temperature: Option<f32>,
    pub tools: Option<Vec<ToolDefinition>>,
    pub images: Option<Vec<Base64Image>>,
    pub stream: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Message {
    pub role: Role,                  // System | User | Assistant | Tool
    pub content: MessageContent,     // Text | MultiPart
}
```

**Router with automatic fallback:**
```rust
pub struct ModelRouter {
    adapters: HashMap<ProviderId, Arc<dyn ModelAdapter>>,
    active_provider: RwLock<ProviderId>,
    fallback_chain: Vec<ProviderId>,
}

impl ModelRouter {
    pub async fn complete(&self, req: CompletionRequest) 
        -> Result<CompletionResponse, ModelError> 
    {
        let primary = self.active_provider.read().await.clone();
        
        match self.adapters[&primary].complete(req.clone()).await {
            Ok(res) => Ok(res),
            Err(e) if e.is_retryable() => {
                // walk fallback chain
                for provider in &self.fallback_chain {
                    if let Ok(res) = self.adapters[provider]
                        .complete(req.clone()).await 
                    {
                        return Ok(res);
                    }
                }
                Err(e)
            }
            Err(e) => Err(e),
        }
    }
}
```

**Tauri command exposure:**
```rust
#[tauri::command]
async fn chat_complete(
    req: CompletionRequest,
    router: State<'_, Arc<ModelRouter>>,
    window: Window,
) -> Result<String, String> {
    let (tx, mut rx) = mpsc::channel::<StreamChunk>(32);
    
    tokio::spawn({
        let router = router.inner().clone();
        async move {
            router.stream(req, tx).await.ok();
        }
    });
    
    while let Some(chunk) = rx.recv().await {
        window.emit("stream-chunk", &chunk).ok();
    }
    
    Ok("done".into())
}
```

**RAG Embedding Pipeline:**
```rust
pub struct EmbeddingPipeline {
    adapter: Arc<dyn ModelAdapter>,
    vector_store: Arc<LanceDBStore>,
    chunker: TextChunker,
}

impl EmbeddingPipeline {
    pub async fn ingest(&self, source: IngestSource) -> Result<(), PipelineError> {
        let text = self.extract_text(source).await?;
        let chunks = self.chunker.chunk(&text, ChunkConfig {
            size: 512,
            overlap: 64,
            strategy: ChunkStrategy::Semantic,
        });
        
        let embeddings = self.adapter
            .embed(chunks.iter().map(|c| c.text.clone()).collect())
            .await?;
        
        self.vector_store.upsert(
            chunks.into_iter().zip(embeddings).map(|(chunk, emb)| {
                VectorRecord { id: chunk.id, text: chunk.text, vector: emb, metadata: chunk.metadata }
            }).collect()
        ).await?;
        
        Ok(())
    }
    
    pub async fn retrieve(&self, query: &str, top_k: usize) 
        -> Result<Vec<VectorRecord>, PipelineError> 
    {
        let query_vec = self.adapter.embed(vec![query.to_string()]).await?;
        self.vector_store.search(&query_vec[0], top_k).await
    }
}
```

**Frontend — model selector in settings:**
```typescript
// stores/modelStore.ts
interface ModelConfig {
  provider: 'anthropic' | 'gemini' | 'openai' | 'local';
  modelId: string;
  apiKey?: string;
  baseUrl?: string;          // for custom OpenAI-compatible endpoints
  embeddingModel?: string;
  visionEnabled: boolean;
}

const useModelStore = create<ModelStore>()(
  persist(
    (set, get) => ({
      configs: [] as ModelConfig[],
      activeConfigId: null as string | null,
      setActive: (id: string) => set({ activeConfigId: id }),
      addConfig: (config: ModelConfig) =>
        set((s) => ({ configs: [...s.configs, config] })),
    }),
    { name: 'model-config' }
  )
);
```

**Production hardening:**
- Store API keys in OS keychain via `keyring` crate — never in plain config files
- Rate limit all outbound API calls with a token bucket per provider
- Log all requests/responses (scrubbed of key content) to a local SQLite audit log
- Implement request deduplication: identical prompts within 30s return cached response

---

## F2 · Local Model Support

### Goal
Run open-weight models fully on-device. No API key, no internet required.
First-class citizen in the model router — not a bolted-on afterthought.

### Architecture

```
Tauri App
    │
    ├── Ollama Sidecar (managed process)  ←→  ~/.ollama/models/
    │       │
    │       └── REST API: localhost:11434
    │
    └── LocalAdapter (Rust) → reqwest → Ollama API
```

**Why Ollama:** It handles model downloads, GPU detection, quantization selection,
and exposes an OpenAI-compatible REST API. You get llama.cpp under the hood
without having to manage it yourself.

**Ollama as a Tauri sidecar:**
```json
// tauri.conf.json
{
  "tauri": {
    "bundle": {
      "externalBin": ["binaries/ollama"]
    }
  }
}
```

```rust
// src-tauri/src/ollama.rs
use tauri::api::process::{Command, CommandChild};

pub struct OllamaProcess {
    child: Option<CommandChild>,
}

impl OllamaProcess {
    pub fn start(&mut self) -> Result<(), OllamaError> {
        let (_, child) = Command::new_sidecar("ollama")
            .map_err(OllamaError::Spawn)?
            .args(["serve"])
            .spawn()
            .map_err(OllamaError::Spawn)?;
        
        self.child = Some(child);
        self.wait_for_ready().await?;
        Ok(())
    }
    
    async fn wait_for_ready(&self) -> Result<(), OllamaError> {
        for _ in 0..30 {
            if reqwest::get("http://localhost:11434").await.is_ok() {
                return Ok(());
            }
            tokio::time::sleep(Duration::from_millis(500)).await;
        }
        Err(OllamaError::Timeout)
    }
}
```

**LocalAdapter implementing ModelAdapter trait:**
```rust
pub struct OllamaAdapter {
    base_url: String,
    client: reqwest::Client,
    active_model: RwLock<String>,
}

#[async_trait]
impl ModelAdapter for OllamaAdapter {
    async fn complete(&self, req: CompletionRequest) 
        -> Result<CompletionResponse, ModelError> 
    {
        // Ollama uses OpenAI-compatible /api/chat endpoint
        let model = self.active_model.read().await.clone();
        let body = OllamaChatRequest {
            model,
            messages: req.messages.into_iter().map(Into::into).collect(),
            stream: false,
            options: OllamaOptions {
                num_ctx: Some(req.max_tokens.unwrap_or(4096)),
                temperature: req.temperature,
            },
        };
        
        let res: OllamaChatResponse = self.client
            .post(format!("{}/api/chat", self.base_url))
            .json(&body)
            .send().await?
            .json().await?;
        
        Ok(res.into())
    }
    
    async fn embed(&self, texts: Vec<String>) 
        -> Result<Vec<Vec<f32>>, ModelError> 
    {
        // Use nomic-embed-text or mxbai-embed-large for local embeddings
        let model = "nomic-embed-text".to_string();
        let mut results = Vec::new();
        
        for text in texts {
            let res: OllamaEmbedResponse = self.client
                .post(format!("{}/api/embeddings", self.base_url))
                .json(&json!({ "model": model, "prompt": text }))
                .send().await?
                .json().await?;
            
            results.push(res.embedding);
        }
        
        Ok(results)
    }
}
```

**Model Manager — Tauri commands:**
```rust
#[tauri::command]
async fn list_local_models(
    ollama: State<'_, Arc<OllamaProcess>>,
) -> Result<Vec<LocalModel>, String> {
    // GET localhost:11434/api/tags
    ollama.list_models().await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn pull_model(
    model_name: String,
    window: Window,
    ollama: State<'_, Arc<OllamaProcess>>,
) -> Result<(), String> {
    // Stream pull progress → emit to frontend
    ollama.pull_with_progress(&model_name, |progress| {
        window.emit("model-pull-progress", progress).ok();
    }).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn delete_model(model_name: String) -> Result<(), String> { ... }

#[tauri::command]
async fn get_system_capabilities() -> Result<SystemInfo, String> {
    // Report VRAM, RAM, CPU cores — frontend uses this to recommend model sizes
    Ok(SystemInfo {
        vram_mb: detect_vram(),
        ram_mb: sys_info::mem_info()?.total as u32 / 1024,
        cpu_cores: num_cpus::get() as u32,
        gpu_vendor: detect_gpu_vendor(),
    })
}
```

**Frontend — Model Manager UI:**
```typescript
// Recommended model matrix based on system capabilities
const MODEL_REQUIREMENTS: Record<string, { minVram: number; minRam: number }> = {
  'llama3.2:1b':    { minVram: 0,    minRam: 4096  },
  'llama3.2:3b':    { minVram: 2048, minRam: 8192  },
  'llama3.1:8b':    { minVram: 4096, minRam: 16384 },
  'llama3.1:70b':   { minVram: 40960, minRam: 64000 },
  'mistral:7b':     { minVram: 4096, minRam: 16384 },
  'qwen2.5:14b':    { minVram: 8192, minRam: 32768 },
  'nomic-embed-text': { minVram: 0,  minRam: 2048  }, // always recommend
};

function getRecommendedModels(system: SystemInfo): string[] {
  return Object.entries(MODEL_REQUIREMENTS)
    .filter(([, req]) => 
      system.vram_mb >= req.minVram && 
      system.ram_mb >= req.minRam
    )
    .map(([name]) => name);
}
```

**Production hardening:**
- Auto-start Ollama when app launches; auto-stop when app closes
- Health-check Ollama every 30s; restart silently if it crashes
- Enforce a max concurrent generation limit (1 for 8B models, configurable)
- Show real-time VRAM usage during inference; warn if approaching system limit

---

## F3 · Web Search & Deep Search

### Goal
**Web search:** One-pass retrieval — search, fetch top results, summarize.
**Deep search:** Autonomous multi-step research — the agent plans, searches, reads,
evaluates what it found, identifies gaps, and searches again until it has a complete answer.

### Architecture

```
SearchOrchestrator (Rust)
    │
    ├── SearchProviderPool
    │     ├── BraveSearchAdapter   (primary — best privacy, structured API)
    │     ├── SearXNGAdapter       (fallback — self-hosted, no rate limits)
    │     └── TavilyAdapter        (optional — best for deep research use case)
    │
    ├── WebFetcher
    │     ├── reqwest (raw fetch)
    │     ├── readability-rs (content extraction)
    │     └── Response cache (SQLite, 1hr TTL)
    │
    └── DeepSearchAgent (LangGraph-style state machine)
          ├── Plan → Search → Fetch → Evaluate → Gap-fill → Synthesize
          └── Max iterations: configurable (default: 5)
```

**Cargo.toml:**
```toml
reqwest = { version = "0.12", features = ["json", "stream", "gzip"] }
scraper = "0.19"           # HTML parsing
readability = "0.1"        # article extraction (readability algorithm)
url = "2"
serde_json = "1"
moka = "0.12"              # async in-memory cache
```

**Search provider trait:**
```rust
#[async_trait]
pub trait SearchProvider: Send + Sync {
    async fn search(&self, query: SearchQuery) 
        -> Result<Vec<SearchResult>, SearchError>;
    fn name(&self) -> &str;
    fn rate_limit(&self) -> RateLimit;
}

#[derive(Debug, Clone)]
pub struct SearchQuery {
    pub q: String,
    pub num_results: usize,
    pub freshness: Option<Freshness>,   // Day | Week | Month | Any
    pub safe_search: bool,
    pub language: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct SearchResult {
    pub title: String,
    pub url: String,
    pub snippet: String,
    pub published: Option<DateTime<Utc>>,
    pub source_domain: String,
}
```

**Brave Search adapter:**
```rust
pub struct BraveSearchAdapter {
    api_key: String,
    client: reqwest::Client,
    rate_limiter: Arc<RateLimiter>,
}

#[async_trait]
impl SearchProvider for BraveSearchAdapter {
    async fn search(&self, query: SearchQuery) 
        -> Result<Vec<SearchResult>, SearchError> 
    {
        self.rate_limiter.acquire().await;
        
        let res: BraveSearchResponse = self.client
            .get("https://api.search.brave.com/res/v1/web/search")
            .header("Accept", "application/json")
            .header("X-Subscription-Token", &self.api_key)
            .query(&[
                ("q", &query.q),
                ("count", &query.num_results.to_string()),
                ("safesearch", if query.safe_search { "strict" } else { "off" }),
            ])
            .send().await?
            .json().await?;
        
        Ok(res.web.results.into_iter().map(|r| SearchResult {
            title: r.title,
            url: r.url,
            snippet: r.description,
            published: r.page_age.and_then(|a| parse_date(&a)),
            source_domain: extract_domain(&r.url),
        }).collect())
    }
}
```

**WebFetcher — extract clean readable text from any URL:**
```rust
pub struct WebFetcher {
    client: reqwest::Client,
    cache: Arc<Cache<String, FetchedPage>>,
}

impl WebFetcher {
    pub async fn fetch(&self, url: &str) -> Result<FetchedPage, FetchError> {
        // Check cache first
        if let Some(cached) = self.cache.get(url) {
            return Ok(cached);
        }
        
        let res = self.client
            .get(url)
            .header("User-Agent", "Mozilla/5.0 (compatible; research-agent)")
            .timeout(Duration::from_secs(10))
            .send().await?;
        
        let html = res.text().await?;
        let document = scraper::Html::parse_document(&html);
        
        // Extract clean article text using readability algorithm
        let article = readability::extractor::get_dom_content(
            &document, url
        )?;
        
        let page = FetchedPage {
            url: url.to_string(),
            title: article.title,
            content: article.content,
            word_count: article.content.split_whitespace().count(),
            fetched_at: Utc::now(),
        };
        
        self.cache.insert(url.to_string(), page.clone()).await;
        Ok(page)
    }
}
```

**Deep Search — state machine:**
```rust
#[derive(Debug, Clone)]
pub enum DeepSearchState {
    Planning { goal: String },
    Searching { plan: ResearchPlan, iteration: u8 },
    Fetching { results: Vec<SearchResult>, iteration: u8 },
    Evaluating { pages: Vec<FetchedPage>, iteration: u8 },
    GapFilling { gaps: Vec<String>, iteration: u8 },
    Synthesizing { all_sources: Vec<FetchedPage> },
    Complete { report: String, sources: Vec<Citation> },
}

pub struct DeepSearchAgent {
    model: Arc<ModelRouter>,
    search: Arc<SearchOrchestrator>,
    fetcher: Arc<WebFetcher>,
    max_iterations: u8,
    event_tx: mpsc::Sender<DeepSearchEvent>,
}

impl DeepSearchAgent {
    pub async fn run(&self, goal: String) -> Result<DeepSearchResult, AgentError> {
        let mut state = DeepSearchState::Planning { goal };
        let mut all_sources: Vec<FetchedPage> = Vec::new();
        
        loop {
            state = match state {
                DeepSearchState::Planning { goal } => {
                    let plan = self.plan(&goal).await?;
                    self.event_tx.send(DeepSearchEvent::PlanCreated(plan.clone())).await.ok();
                    DeepSearchState::Searching { plan, iteration: 0 }
                }
                
                DeepSearchState::Searching { plan, iteration } => {
                    if iteration >= self.max_iterations {
                        DeepSearchState::Synthesizing { all_sources: all_sources.clone() }
                    } else {
                        let results = self.search.search_all(&plan.queries).await?;
                        self.event_tx.send(DeepSearchEvent::SearchComplete { 
                            count: results.len(), iteration 
                        }).await.ok();
                        DeepSearchState::Fetching { results, iteration }
                    }
                }
                
                DeepSearchState::Fetching { results, iteration } => {
                    // Fetch top N pages — rank by snippet relevance first
                    let to_fetch = self.rank_results(&results, 5);
                    let pages = futures::future::join_all(
                        to_fetch.iter().map(|r| self.fetcher.fetch(&r.url))
                    ).await.into_iter().flatten().collect::<Vec<_>>();
                    
                    all_sources.extend(pages.clone());
                    DeepSearchState::Evaluating { pages, iteration }
                }
                
                DeepSearchState::Evaluating { pages, iteration } => {
                    let eval = self.evaluate_coverage(&pages).await?;
                    
                    if eval.gaps.is_empty() || iteration >= self.max_iterations - 1 {
                        DeepSearchState::Synthesizing { all_sources: all_sources.clone() }
                    } else {
                        self.event_tx.send(DeepSearchEvent::GapsFound(eval.gaps.clone())).await.ok();
                        DeepSearchState::GapFilling { gaps: eval.gaps, iteration: iteration + 1 }
                    }
                }
                
                DeepSearchState::GapFilling { gaps, iteration } => {
                    let new_plan = self.plan_gap_queries(&gaps).await?;
                    DeepSearchState::Searching { plan: new_plan, iteration }
                }
                
                DeepSearchState::Synthesizing { all_sources } => {
                    let report = self.synthesize(&all_sources).await?;
                    DeepSearchState::Complete {
                        report: report.text,
                        sources: report.citations,
                    }
                }
                
                DeepSearchState::Complete { report, sources } => {
                    return Ok(DeepSearchResult { report, sources });
                }
            };
        }
    }
}
```

**Frontend — real-time progress display:**
```typescript
// Stream deep search events from Tauri
useEffect(() => {
  const unlisten = listen<DeepSearchEvent>('deep-search-event', (event) => {
    switch (event.payload.type) {
      case 'PlanCreated':
        setSearchPlan(event.payload.plan);
        break;
      case 'SearchComplete':
        setProgress(prev => [...prev, `Found ${event.payload.count} results (pass ${event.payload.iteration + 1})`]);
        break;
      case 'GapsFound':
        setProgress(prev => [...prev, `Gaps found: ${event.payload.gaps.join(', ')} — searching further...`]);
        break;
    }
  });
  return () => { unlisten.then(f => f()); };
}, []);
```

**Production hardening:**
- Rate limit per provider using a sliding window counter in Redis or SQLite
- Never fetch the same URL twice in one session — deduplicate by normalized URL
- Respect robots.txt — check before fetching
- Hard cap: deep search never runs more than 8 iterations and never fetches more than 40 pages per session
- All fetched content is stored in a session cache only — never persisted permanently without user consent

---

## F4 · CLI Tool Integration

### Goal
The agent discovers, calls, and interprets local CLI tools as first-class skills.
Execution is sandboxed, user-approved, and fully logged.

### Architecture

```
CLIToolRegistry (Rust)
    │
    ├── ToolManifest (TOML per tool)
    │     ├── name, description, binary_path
    │     ├── allowed_args_pattern (regex whitelist)
    │     └── required_permissions: [filesystem, network, etc.]
    │
    ├── CLIExecutor
    │     ├── Sandboxed subprocess with timeout
    │     ├── stdout/stderr capture + streaming
    │     └── Exit code interpretation
    │
    └── ApprovalGate
          ├── Low-risk tools: auto-approve
          ├── High-risk tools: require user confirmation before each run
          └── Blocked tools: never run regardless of request
```

**Tool manifest format (TOML):**
```toml
# ~/.config/your-app/tools/git.toml
[tool]
name = "git"
description = "Version control. Can read repo status, log, diff. Cannot push or force."
binary = "git"
risk_level = "low"           # low | medium | high

[allowed_commands]
patterns = [
  "^git (status|log|diff|branch|show)",  # safe read commands
  "^git (add|commit|stash)",             # write but local
]

[blocked_commands]
patterns = [
  "^git (push|force|reset --hard)",      # never allow remote writes
]

[output]
max_bytes = 65536
timeout_seconds = 30
```

**CLIExecutor — sandboxed subprocess:**
```rust
pub struct CLIExecutor {
    registry: Arc<CLIToolRegistry>,
    approval_gate: Arc<ApprovalGate>,
    audit_log: Arc<AuditLogger>,
}

impl CLIExecutor {
    pub async fn execute(
        &self,
        tool_name: &str,
        command: &str,
        tx: mpsc::Sender<ExecutionEvent>,
    ) -> Result<ExecutionResult, ExecutorError> {
        // 1. Look up manifest
        let manifest = self.registry.get(tool_name)
            .ok_or(ExecutorError::UnknownTool)?;
        
        // 2. Validate command against allowed patterns
        manifest.validate_command(command)?;
        
        // 3. Check approval gate
        if manifest.risk_level >= RiskLevel::Medium {
            let approved = self.approval_gate
                .request_approval(tool_name, command)
                .await?;
            
            if !approved {
                return Err(ExecutorError::Rejected);
            }
        }
        
        // 4. Log intent
        self.audit_log.log_execution(tool_name, command, AuditStatus::Starting).await;
        
        // 5. Execute with timeout
        let mut child = tokio::process::Command::new(&manifest.binary)
            .args(parse_args(command))
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .kill_on_drop(true)    // kills subprocess if we drop it
            .spawn()?;
        
        // 6. Stream output
        let stdout = child.stdout.take().unwrap();
        let mut reader = BufReader::new(stdout).lines();
        let mut full_output = String::new();
        
        let timeout = Duration::from_secs(manifest.timeout_seconds);
        let deadline = Instant::now() + timeout;
        
        loop {
            if Instant::now() > deadline {
                child.kill().await.ok();
                return Err(ExecutorError::Timeout);
            }
            
            match tokio::time::timeout_at(deadline.into(), reader.next_line()).await {
                Ok(Ok(Some(line))) => {
                    full_output.push_str(&line);
                    full_output.push('\n');
                    tx.send(ExecutionEvent::Line(line)).await.ok();
                    
                    if full_output.len() > manifest.max_output_bytes {
                        child.kill().await.ok();
                        return Err(ExecutorError::OutputTooLarge);
                    }
                }
                Ok(Ok(None)) => break, // EOF
                _ => break,
            }
        }
        
        let status = child.wait().await?;
        self.audit_log.log_execution(tool_name, command, AuditStatus::Complete).await;
        
        Ok(ExecutionResult {
            stdout: full_output,
            exit_code: status.code().unwrap_or(-1),
            timed_out: false,
        })
    }
}
```

**Auto-discovery of installed tools:**
```rust
pub async fn discover_installed_tools() -> Vec<DiscoveredTool> {
    let candidates = ["git", "ffmpeg", "imagemagick", "python3", "node", 
                       "npm", "cargo", "docker", "gh", "jq", "curl"];
    
    futures::future::join_all(
        candidates.iter().map(|name| async move {
            let path = which::which(name).ok()?;
            let version = get_version(name).await.ok()?;
            Some(DiscoveredTool { name: name.to_string(), path, version })
        })
    ).await.into_iter().flatten().collect()
}
```

**Production hardening:**
- Never construct a shell string — always pass args as a `Vec<String>` to avoid injection
- PATH is explicitly set to a safe minimal value before spawning
- All subprocess output is size-capped and time-capped before being returned to the model
- Audit log (SQLite) records every execution: tool, command, exit code, timestamp, who requested it

---

## F5 · Agent Skills Framework

### Goal
A universal, typed registry where every capability — built-in, plugin, CLI, or API-based —
is registered as a Skill the model can discover and invoke through standard tool calling.

### Architecture

```
SkillRegistry (Rust singleton, app lifetime)
    │
    ├── BuiltInSkills           (filesystem, screenshot, clipboard, etc.)
    ├── CLISkills               (from F4 — wrapped as skills)
    ├── PluginSkills            (from F9 — loaded at runtime)
    └── RemoteSkills            (HTTP APIs registered by user)
         │
         ▼
SkillExecutor
    │
    ├── InputValidator (JSON Schema)
    ├── ApprovalGate
    ├── ResultFormatter
    └── Audit Logger
```

**Skill definition:**
```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillDefinition {
    pub name: String,                    // snake_case, unique
    pub description: String,             // what the model sees — be precise
    pub input_schema: serde_json::Value, // JSON Schema for input validation
    pub output_schema: serde_json::Value,
    pub risk_level: RiskLevel,
    pub requires_approval: bool,
    pub category: SkillCategory,
}

// The actual executable
pub struct Skill {
    pub definition: SkillDefinition,
    pub handler: Arc<dyn SkillHandler>,
}

#[async_trait]
pub trait SkillHandler: Send + Sync {
    async fn execute(
        &self,
        input: serde_json::Value,
        context: &SkillContext,
    ) -> Result<SkillOutput, SkillError>;
}
```

**Built-in skill example — read file:**
```rust
pub struct ReadFileSkill;

#[async_trait]
impl SkillHandler for ReadFileSkill {
    async fn execute(
        &self,
        input: serde_json::Value,
        _ctx: &SkillContext,
    ) -> Result<SkillOutput, SkillError> {
        let path: PathBuf = serde_json::from_value(input["path"].clone())?;
        
        // Security: resolve and validate path stays within allowed dirs
        let resolved = path.canonicalize()
            .map_err(|_| SkillError::InvalidPath)?;
        
        if !is_within_allowed_dirs(&resolved) {
            return Err(SkillError::PermissionDenied);
        }
        
        let content = tokio::fs::read_to_string(&resolved).await
            .map_err(SkillError::IoError)?;
        
        // Truncate if too large for model context
        let truncated = if content.len() > 32_000 {
            format!("{}...[truncated {} chars]", &content[..32_000], content.len() - 32_000)
        } else {
            content
        };
        
        Ok(SkillOutput::text(truncated))
    }
}

// Register it
registry.register(Skill {
    definition: SkillDefinition {
        name: "read_file".into(),
        description: "Read the text contents of a file at the given path. \
                       Only files within the user's home directory or workspace are accessible.".into(),
        input_schema: json!({
            "type": "object",
            "properties": {
                "path": { "type": "string", "description": "Absolute or relative file path" }
            },
            "required": ["path"]
        }),
        output_schema: json!({ "type": "string" }),
        risk_level: RiskLevel::Low,
        requires_approval: false,
        category: SkillCategory::Filesystem,
    },
    handler: Arc::new(ReadFileSkill),
});
```

**Wiring skills into model tool-calling:**
```rust
// Before each model request, inject available skills as tools
pub fn skills_to_tools(registry: &SkillRegistry) -> Vec<ToolDefinition> {
    registry.all().iter().map(|skill| {
        ToolDefinition {
            name: skill.definition.name.clone(),
            description: skill.definition.description.clone(),
            input_schema: skill.definition.input_schema.clone(),
        }
    }).collect()
}

// After model response, dispatch tool calls
pub async fn dispatch_tool_calls(
    tool_calls: Vec<ToolCall>,
    registry: &SkillRegistry,
    executor: &SkillExecutor,
    context: &SkillContext,
) -> Vec<ToolResult> {
    futures::future::join_all(
        tool_calls.iter().map(|call| async {
            let skill = registry.get(&call.name)?;
            let output = executor.execute(skill, call.input.clone(), context).await;
            ToolResult {
                tool_call_id: call.id.clone(),
                content: match output {
                    Ok(out) => out.to_string(),
                    Err(e) => format!("Error: {}", e),
                },
            }
        })
    ).await.into_iter().flatten().collect()
}
```

**Production hardening:**
- Skill names are validated against a strict regex on registration — no spaces, no special chars
- Input is always validated against JSON Schema before handler is called — never pass raw model output to a handler
- Skills run in isolated async tasks with their own timeout
- A skill that panics is caught and converted to an error response — never crash the agent loop

---

## F6 · Computer Use

### Goal
The agent sees the screen and controls mouse/keyboard to complete desktop tasks.
Every action is logged, user-confirmable, and instantly stoppable.

### Architecture

```
ComputerUseAgent
    │
    ├── ScreenCapture (Tauri + xcap crate)
    ├── VisionModel   (Gemini Vision / Claude 3.5 Sonnet)
    ├── ActionPlanner (model generates action list)
    ├── ActionExecutor
    │     └── enigo crate (cross-platform input simulation)
    ├── ConfirmationGate (frontend approval UI)
    └── SessionRecorder (action log + screenshots)
```

**Cargo dependencies:**
```toml
xcap = "0.0.14"          # cross-platform screen capture
enigo = "0.2"            # cross-platform mouse/keyboard control
image = "0.25"           # image processing for screenshots
base64 = "0.22"
```

**Action types:**
```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum ComputerAction {
    Screenshot,
    MouseMove { x: i32, y: i32 },
    MouseClick { x: i32, y: i32, button: MouseButton },
    MouseDoubleClick { x: i32, y: i32 },
    TypeText { text: String },
    KeyPress { key: Key, modifiers: Vec<Modifier> },
    Scroll { x: i32, y: i32, direction: ScrollDirection, amount: u32 },
    Wait { ms: u64 },
}
```

**Main agent loop:**
```rust
pub struct ComputerUseSession {
    goal: String,
    model: Arc<ModelRouter>,
    enigo: Mutex<Enigo>,
    screen: Arc<ScreenCapture>,
    approval_tx: mpsc::Sender<ApprovalRequest>,
    stop_rx: watch::Receiver<bool>,
    recorder: Arc<SessionRecorder>,
    max_steps: u32,
}

impl ComputerUseSession {
    pub async fn run(&self) -> Result<SessionResult, ComputerUseError> {
        let mut step = 0;
        let mut history: Vec<ActionRecord> = Vec::new();
        
        loop {
            // Check stop signal — user can halt at any time
            if *self.stop_rx.borrow() {
                return Ok(SessionResult::StoppedByUser { steps: step });
            }
            
            if step >= self.max_steps {
                return Err(ComputerUseError::MaxStepsReached);
            }
            
            // 1. Capture current screen state
            let screenshot = self.screen.capture().await?;
            let screenshot_b64 = screenshot.to_base64();
            self.recorder.record_screenshot(step, &screenshot).await;
            
            // 2. Ask model what to do next
            let prompt = build_computer_use_prompt(&self.goal, &history, step);
            let response = self.model.complete(CompletionRequest {
                messages: vec![Message {
                    role: Role::User,
                    content: MessageContent::MultiPart(vec![
                        Part::Image(screenshot_b64),
                        Part::Text(prompt),
                    ]),
                }],
                tools: Some(computer_use_tools()),
                ..Default::default()
            }).await?;
            
            // 3. Parse actions from model response
            let actions = parse_actions_from_response(&response)?;
            
            if actions.iter().any(|a| matches!(a, ComputerAction::TypeText { .. })) 
               || actions.len() > 3 
            {
                // High-risk batch — require user approval
                let approved = self.request_approval(&actions).await?;
                if !approved { continue; }
            }
            
            // 4. Execute each action
            for action in &actions {
                self.execute_action(action).await?;
                self.recorder.record_action(step, action).await;
                tokio::time::sleep(Duration::from_millis(150)).await; // pace actions
            }
            
            history.push(ActionRecord { step, actions, screenshot_description: "..." });
            step += 1;
            
            // 5. Check if goal is complete
            if response.signals_completion() {
                return Ok(SessionResult::Complete { steps: step });
            }
        }
    }
}
```

**Production hardening:**
- Hard limit: 50 actions per session maximum
- Actions that type into password fields: never log the typed text
- A hardware kill-switch: listening for a global hotkey (e.g. Cmd+Shift+Esc) that fires stop signal
- Never run without an active screen — detect headless environment and refuse
- Session recordings stored locally, encrypted, auto-deleted after 7 days

---

## F7 · Browser Use

### Goal
Agent controls a real Chromium browser through CDP — navigates, clicks, fills forms,
and extracts structured data. More precise than Computer Use for web tasks.

### Architecture

```
BrowserUseAgent
    │
    ├── BrowserManager (Rust)
    │     └── Chromium subprocess (bundled or system)
    │
    ├── CDPClient (Chrome DevTools Protocol over WebSocket)
    │     ├── Page.navigate
    │     ├── Runtime.evaluate  (DOM queries, JS execution)
    │     ├── Input.dispatchMouseEvent
    │     ├── Input.dispatchKeyEvent
    │     └── Page.captureScreenshot
    │
    └── DOMExtractor
          └── Produce accessibility tree → feed to model (more efficient than screenshots)
```

**Cargo dependencies:**
```toml
chromiumoxide = "0.6"    # Rust CDP client — wraps Chromium
tokio-tungstenite = "0.21"
futures = "0.3"
```

**Browser skill actions:**
```rust
pub struct BrowserUseAgent {
    browser: Arc<chromiumoxide::Browser>,
    model: Arc<ModelRouter>,
    page: Arc<chromiumoxide::Page>,
}

impl BrowserUseAgent {
    pub async fn navigate(&self, url: &str) -> Result<(), BrowserError> {
        self.page.goto(url).await?;
        self.page.wait_for_navigation().await?;
        Ok(())
    }
    
    pub async fn get_dom_snapshot(&self) -> Result<DomSnapshot, BrowserError> {
        // Get accessibility tree — far smaller than full HTML, better for model
        let tree = self.page
            .accessibility_snapshot(Default::default())
            .await?;
        Ok(DomSnapshot::from_accessibility_tree(tree))
    }
    
    pub async fn click_element(&self, selector: &str) -> Result<(), BrowserError> {
        let element = self.page.find_element(selector).await?;
        element.click().await?;
        Ok(())
    }
    
    pub async fn type_into(&self, selector: &str, text: &str) -> Result<(), BrowserError> {
        let element = self.page.find_element(selector).await?;
        element.click().await?;
        self.page.type_str(text).await?;
        Ok(())
    }
    
    pub async fn extract_structured(&self, schema: &str) -> Result<serde_json::Value, BrowserError> {
        // Take screenshot + DOM snapshot → ask model to extract into schema
        let screenshot = self.page.screenshot(Default::default()).await?;
        let dom = self.get_dom_snapshot().await?;
        
        let result = self.model.complete(CompletionRequest {
            messages: vec![Message {
                role: Role::User,
                content: MessageContent::MultiPart(vec![
                    Part::Image(base64::encode(&screenshot)),
                    Part::Text(format!(
                        "Extract data matching this schema from the page:\n{}\n\nPage content:\n{}",
                        schema, dom.to_markdown()
                    )),
                ]),
            }],
            ..Default::default()
        }).await?;
        
        serde_json::from_str(&result.text).map_err(BrowserError::ParseError)
    }
}
```

**Production hardening:**
- Run browser in a dedicated profile directory with no extensions and no saved passwords
- Disable WebRTC to prevent IP leakage during research tasks
- Intercept and block telemetry domains in the browser's request interceptor
- Set a strict CSP on the Tauri webview itself so the embedded browser cannot reach app internals

---

## F8 · Remote Control API

### Goal
Expose a local authenticated HTTP API so any device (or bridge — see F12) can
send messages and receive responses from the agent.

### Architecture

```
Axum HTTP Server (Rust, runs inside Tauri app process)
    │
    ├── POST /v1/chat/completions   (OpenAI-compatible format)
    ├── POST /v1/agent/run          (kick off an agent task)
    ├── GET  /v1/agent/status/:id   (poll task status)
    ├── WS   /v1/stream             (real-time event stream)
    └── GET  /v1/health
    │
    ├── Auth: Bearer token (generated in settings, stored in OS keychain)
    │
    └── Optional tunnel: Cloudflare Tunnel → public HTTPS URL
```

**Axum server setup inside Tauri:**
```rust
// Runs as a tokio task spawned at app startup
pub async fn start_api_server(
    port: u16,
    app_handle: AppHandle,
    config: ServerConfig,
) -> Result<(), ServerError> {
    let state = ApiState {
        agent: app_handle.state::<Arc<AgentCore>>().inner().clone(),
        auth_token: config.api_key.clone(),
    };
    
    let app = Router::new()
        .route("/v1/chat/completions", post(chat_handler))
        .route("/v1/agent/run", post(run_agent_handler))
        .route("/v1/agent/status/:id", get(agent_status_handler))
        .route("/v1/stream", get(ws_handler))
        .route("/v1/health", get(health_handler))
        .layer(from_fn_with_state(state.clone(), auth_middleware))
        .layer(CorsLayer::permissive())    // localhost-only, so permissive is fine
        .with_state(state);
    
    let listener = tokio::net::TcpListener::bind(
        format!("127.0.0.1:{}", port)
    ).await?;
    
    axum::serve(listener, app).await?;
    Ok(())
}

// Auth middleware
async fn auth_middleware(
    State(state): State<ApiState>,
    request: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    let token = request
        .headers()
        .get("Authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
        .ok_or(StatusCode::UNAUTHORIZED)?;
    
    if !constant_time_eq(token.as_bytes(), state.auth_token.as_bytes()) {
        return Err(StatusCode::UNAUTHORIZED);
    }
    
    Ok(next.run(request).await)
}
```

**Cloudflare Tunnel integration (optional external access):**
```rust
pub struct TunnelManager {
    child: Option<CommandChild>,
    public_url: Option<String>,
}

impl TunnelManager {
    pub async fn start(&mut self, local_port: u16) -> Result<String, TunnelError> {
        // cloudflared is bundled as a sidecar
        let (rx, child) = Command::new_sidecar("cloudflared")
            .args(["tunnel", "--url", &format!("http://localhost:{}", local_port)])
            .spawn()?;
        
        // Parse tunnel URL from cloudflared stdout
        // "Your quick Tunnel has been created! Visit it at https://xxxx.trycloudflare.com"
        let public_url = extract_tunnel_url(rx).await?;
        self.child = Some(child);
        self.public_url = Some(public_url.clone());
        
        Ok(public_url)
    }
}
```

**Production hardening:**
- API only binds to 127.0.0.1 by default — never 0.0.0.0 unless tunnel is explicitly enabled
- Token is 32 bytes of OS-randomness, shown once in setup, stored in keychain
- All API requests are rate-limited: 60/minute per IP
- Tunnel is opt-in with a clear warning that the agent becomes externally reachable

---

## F9 · Plugin & Extension System

### Goal
A secure, manifest-driven plugin system where third parties (or the user) can
extend the agent with new skills, UI panels, or model behaviors — without
touching core app code.

### Architecture

```
~/.config/your-app/plugins/
    └── my-plugin/
          ├── plugin.toml       (manifest)
          ├── skill.wasm        (optional: WASM skill handler)
          └── ui/
                └── panel.html  (optional: injected UI panel)

PluginLoader (Rust)
    ├── Reads manifest, validates signature
    ├── Loads WASM module into wasmtime sandbox
    ├── Registers skills into SkillRegistry (F5)
    └── Injects UI into renderer via Tauri webview API
```

**Plugin manifest:**
```toml
[plugin]
name = "notion-integration"
version = "1.2.0"
author = "Your Name"
description = "Read and write Notion pages as skills"
signature = "sha256:abc123..."   # signed by plugin author

[permissions]
network = ["api.notion.com"]     # only these domains
filesystem = []                  # no filesystem access
secrets = ["NOTION_API_KEY"]     # user must provide these

[[skills]]
name = "notion_read_page"
description = "Read the content of a Notion page by ID"
handler = "skill.wasm"
input_schema = { type = "object", properties = { page_id = { type = "string" } } }

[[skills]]
name = "notion_create_page"
description = "Create a new page in a Notion database"
handler = "skill.wasm"
risk_level = "medium"

[ui]
panel = "ui/panel.html"          # optional sidebar panel
```

**WASM sandbox with wasmtime:**
```toml
# Cargo.toml
wasmtime = { version = "23", features = ["async"] }
wasmtime-wasi = "23"
```

```rust
pub struct WasmSkillRunner {
    engine: Engine,
    store: Store<WasiCtx>,
    instance: Instance,
}

impl WasmSkillRunner {
    pub async fn new(wasm_bytes: &[u8], permissions: &PluginPermissions) 
        -> Result<Self, WasmError> 
    {
        let engine = Engine::new(Config::new().async_support(true))?;
        
        // Build a WASI context that enforces the manifest permissions
        let wasi = WasiCtxBuilder::new()
            .inherit_stdio()
            .preopened_dir(
                // Only add allowed dirs — empty if permissions.filesystem is empty
                &permissions.allowed_dirs(),
                "/"
            )?
            .build();
        
        let mut store = Store::new(&engine, wasi);
        let module = Module::new(&engine, wasm_bytes)?;
        let instance = Instance::new_async(&mut store, &module, &[]).await?;
        
        Ok(Self { engine, store, instance })
    }
    
    pub async fn execute_skill(
        &mut self,
        input: serde_json::Value,
    ) -> Result<serde_json::Value, WasmError> {
        let func = self.instance
            .get_typed_func::<(i32, i32), i32>(&mut self.store, "execute")?;
        
        // Pass input as JSON string through WASM linear memory
        let input_str = serde_json::to_string(&input)?;
        let ptr = self.write_to_memory(&input_str)?;
        let result_ptr = func.call_async(&mut self.store, (ptr, input_str.len() as i32)).await?;
        
        let result_str = self.read_from_memory(result_ptr)?;
        Ok(serde_json::from_str(&result_str)?)
    }
}
```

**Production hardening:**
- WASM sandbox has no access to host OS — only explicit capabilities granted via WASI
- Network calls from plugins go through a proxy that enforces the manifest's domain allowlist
- Plugins must be signed; signature verified against a trusted key registry before loading
- Plugin auto-updates are opt-in per plugin; update manifest is fetched from the plugin's declared update URL
- Memory limit enforced in wasmtime: 64MB per WASM plugin instance

---

## F10 · Parallel Agents

### Goal
A root agent decomposes a complex goal into subtasks and dispatches them to
worker agents running concurrently. Workers report back to the root for synthesis.

### Architecture

```
AgentPool (Rust)
    │
    ├── RootAgent (orchestrator)
    │     ├── Decomposes goal into subtasks
    │     ├── Assigns subtasks to workers
    │     └── Synthesizes worker results
    │
    └── WorkerAgent × N (up to configured max)
          ├── Receives task + context slice
          ├── Has access to skills (F5)
          ├── Reports back partial results as they complete
          └── Has independent timeout
```

**Agent task graph:**
```rust
#[derive(Debug, Clone)]
pub struct AgentTask {
    pub id: TaskId,
    pub parent_id: Option<TaskId>,
    pub goal: String,
    pub context: TaskContext,           // slice of shared context relevant to this task
    pub allowed_skills: Vec<String>,    // subset of skills this worker can use
    pub timeout: Duration,
    pub priority: u8,
}

pub struct AgentPool {
    root_model: Arc<ModelRouter>,
    worker_model: Arc<ModelRouter>,     // can be a smaller/cheaper model
    max_workers: usize,
    active_workers: Arc<RwLock<HashMap<TaskId, JoinHandle<TaskResult>>>>,
    result_tx: mpsc::Sender<TaskResult>,
    skill_registry: Arc<SkillRegistry>,
}

impl AgentPool {
    pub async fn run_parallel(
        &self,
        goal: String,
        window: Window,
    ) -> Result<String, AgentError> {
        // 1. Root agent decomposes the goal
        let decomposition = self.decompose_goal(&goal).await?;
        
        window.emit("agent-pool-started", json!({
            "total_tasks": decomposition.tasks.len()
        })).ok();
        
        // 2. Spawn workers up to max_workers
        let semaphore = Arc::new(Semaphore::new(self.max_workers));
        let mut handles = Vec::new();
        
        for task in decomposition.tasks {
            let permit = semaphore.clone().acquire_owned().await?;
            let pool = self.clone();
            let window = window.clone();
            
            handles.push(tokio::spawn(async move {
                let _permit = permit; // released when task completes
                let result = pool.run_worker(task.clone()).await;
                
                window.emit("agent-task-complete", json!({
                    "task_id": task.id,
                    "success": result.is_ok(),
                })).ok();
                
                (task.id, result)
            }));
        }
        
        // 3. Collect results as they come in
        let results: HashMap<TaskId, TaskResult> = 
            futures::future::join_all(handles).await
                .into_iter()
                .filter_map(|r| r.ok())
                .filter_map(|(id, r)| r.ok().map(|v| (id, v)))
                .collect();
        
        // 4. Root agent synthesizes all results
        let synthesis = self.synthesize_results(&goal, &results).await?;
        
        Ok(synthesis)
    }
    
    async fn decompose_goal(&self, goal: &str) -> Result<TaskDecomposition, AgentError> {
        let response = self.root_model.complete(CompletionRequest {
            messages: vec![
                Message {
                    role: Role::System,
                    content: MessageContent::Text(DECOMPOSITION_SYSTEM_PROMPT.into()),
                },
                Message {
                    role: Role::User,
                    content: MessageContent::Text(format!(
                        "Decompose this goal into independent parallel subtasks: {}",
                        goal
                    )),
                },
            ],
            tools: Some(vec![decomposition_tool_definition()]),
            ..Default::default()
        }).await?;
        
        parse_decomposition_from_response(&response)
    }
}
```

**Production hardening:**
- Hard cap on concurrent workers (default: 4, max: 10) — configurable in settings
- Each worker has its own timeout independent of the root agent
- Workers cannot spawn further workers — prevents exponential agent explosion
- Total token usage tracked across all workers; halt pool if budget exceeded
- All inter-agent communication goes through typed message structs — no raw strings between agents

---

## F11 · Motion Graphics Design

### Goal
Generate and render professional motion graphics from text prompts or user composition,
exported as MP4/GIF/WebM via FFmpeg.

### Architecture

```
Frontend (React)
    │
    ├── Composition Editor
    │     ├── Timeline (react-timeline-editor or custom)
    │     ├── Layer Panel
    │     └── Preview (Remotion Player component)
    │
    └── Prompt-to-Animation Pipeline
          │
          ▼
    Model (generates Remotion composition as TypeScript code)
          │
          ▼
    Code Executor (esbuild in-process → evaluates composition)
          │
          ▼
    Remotion Renderer → FFmpeg (Tauri CLI skill) → output file
```

**npm dependencies:**
```json
{
  "remotion": "^4.0",
  "@remotion/player": "^4.0",
  "@remotion/cli": "^4.0",
  "esbuild": "^0.21",
  "react-timeline-editor": "^2.2"
}
```

**Prompt → Remotion composition:**
```typescript
// The model generates this TypeScript composition from a prompt
const COMPOSITION_SYSTEM_PROMPT = `
You are a Remotion composition generator. Given a description, output a valid 
TypeScript Remotion composition. Rules:
- Use only: @remotion/player, react, remotion built-ins
- No external image URLs — use only solid colors and SVG shapes
- All animations use useCurrentFrame() and interpolate()
- Export a default React component named Composition
- Export a compositionConfig object: { width, height, fps, durationInFrames }
- Output only valid TypeScript, no markdown, no explanation
`;

async function generateComposition(prompt: string): Promise<string> {
  const response = await invoke<string>('chat_complete', {
    req: {
      messages: [
        { role: 'system', content: COMPOSITION_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      stream: false,
    }
  });
  return response;
}
```

**Safe composition evaluation:**
```typescript
import * as esbuild from 'esbuild-wasm';

async function evaluateComposition(code: string): Promise<CompositionModule> {
  // Transpile TypeScript → JS in-browser using esbuild-wasm
  const result = await esbuild.transform(code, {
    loader: 'tsx',
    format: 'cjs',
    target: 'es2020',
  });
  
  // Execute in a sandboxed iframe — no access to Tauri APIs
  const iframe = document.createElement('iframe');
  iframe.sandbox.add('allow-scripts');
  document.body.appendChild(iframe);
  
  return new Promise((resolve, reject) => {
    iframe.contentWindow!.postMessage({ 
      type: 'execute', 
      code: result.code 
    }, '*');
    
    window.addEventListener('message', (e) => {
      if (e.data.type === 'composition-ready') {
        resolve(e.data.module);
      }
    }, { once: true });
  });
}
```

**Export via FFmpeg CLI skill:**
```typescript
async function exportComposition(
  compositionId: string,
  outputPath: string,
  format: 'mp4' | 'gif' | 'webm'
) {
  // Remotion renders to frame sequence first
  await invoke('execute_cli_tool', {
    tool: 'remotion',
    command: `npx remotion render ${compositionId} ${outputPath} --codec=${format}`,
  });
}
```

**Production hardening:**
- Composition code runs in sandboxed iframe — cannot access Tauri IPC or filesystem
- esbuild runs in WASM mode in the browser — no Node.js child process needed
- Set a hard limit on composition duration (max 60 seconds) to prevent runaway renders
- FFmpeg render runs as a background Tauri task with progress events streamed to UI

---

## F12 · Messaging Platform Bridges

### Goal
Each messaging platform runs as an independent lightweight bridge process that
connects to the local API (F8) and relays messages bidirectionally.

### Architecture

```
Telegram Bridge (Node.js sidecar)
Discord Bridge  (Node.js sidecar)     Each bridge:
Slack Bridge    (Node.js sidecar)  →  POST /v1/chat/completions
WhatsApp Bridge (Node.js sidecar)     GET  /v1/stream (SSE)
    │
    └── All bridges connect to the Axum API from F8
```

**Why Node.js sidecars for bridges:** The official SDKs (Telegraf, discord.js,
Slack Bolt) are Node.js. Fighting them in Rust is not worth it. Each bridge is
a tiny ~50-line script. Bundle with `pkg` or `nexe` as a single binary sidecar.

**Generic bridge pattern (all platforms share this shape):**
```typescript
// bridges/shared/bridge-client.ts
export class AppBridgeClient {
  constructor(
    private apiUrl: string,
    private apiKey: string,
  ) {}
  
  async sendMessage(
    text: string,
    conversationId: string,
    attachments?: Buffer[]
  ): Promise<string> {
    const res = await fetch(`${this.apiUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: text }],
        conversation_id: conversationId,
        stream: false,
      }),
    });
    
    const data = await res.json();
    return data.choices[0].message.content;
  }
}
```

**Telegram bridge:**
```typescript
// bridges/telegram/index.ts
import { Telegraf } from 'telegraf';
import { AppBridgeClient } from '../shared/bridge-client';

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);
const client = new AppBridgeClient(
  process.env.APP_API_URL!, 
  process.env.APP_API_KEY!
);

const ALLOWED_USER_IDS = new Set(
  (process.env.ALLOWED_TELEGRAM_IDS ?? '').split(',').map(Number)
);

bot.on('text', async (ctx) => {
  // Only respond to approved users
  if (!ALLOWED_USER_IDS.has(ctx.from.id)) {
    return ctx.reply('Unauthorized.');
  }
  
  await ctx.sendChatAction('typing');
  
  const response = await client.sendMessage(
    ctx.message.text,
    `telegram-${ctx.chat.id}`,
  );
  
  await ctx.reply(response, { parse_mode: 'Markdown' });
});

bot.launch();

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
```

**Discord bridge:**
```typescript
// bridges/discord/index.ts
import { Client, GatewayIntentBits } from 'discord.js';

const client = new Client({ 
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

const TRIGGER_PREFIX = process.env.DISCORD_PREFIX ?? '!ai';
const ALLOWED_CHANNELS = new Set(process.env.ALLOWED_CHANNELS?.split(',') ?? []);

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(TRIGGER_PREFIX)) return;
  if (!ALLOWED_CHANNELS.has(message.channelId)) return;
  
  const text = message.content.slice(TRIGGER_PREFIX.length).trim();
  
  await message.channel.sendTyping();
  const response = await appClient.sendMessage(text, `discord-${message.channelId}`);
  
  // Discord has a 2000 char limit — split if needed
  const chunks = splitIntoChunks(response, 1990);
  for (const chunk of chunks) {
    await message.reply(chunk);
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
```

**Bridge manager in Tauri:**
```rust
pub struct BridgeManager {
    bridges: HashMap<BridgeType, Option<CommandChild>>,
    config: BridgeConfig,
}

impl BridgeManager {
    pub async fn start_bridge(&mut self, bridge_type: BridgeType) -> Result<(), BridgeError> {
        let env = self.build_env_for_bridge(&bridge_type)?;
        
        let (_, child) = Command::new_sidecar(bridge_type.sidecar_name())
            .map_err(BridgeError::Spawn)?
            .envs(env)
            .spawn()?;
        
        self.bridges.insert(bridge_type, Some(child));
        Ok(())
    }
    
    fn build_env_for_bridge(&self, bridge_type: &BridgeType) -> Result<HashMap<String, String>, BridgeError> {
        let api_key = keyring::Entry::new("your-app", "api-key")?.get_password()?;
        
        let mut env = HashMap::from([
            ("APP_API_URL".into(), format!("http://127.0.0.1:{}", self.config.api_port)),
            ("APP_API_KEY".into(), api_key),
        ]);
        
        match bridge_type {
            BridgeType::Telegram => {
                env.insert("TELEGRAM_BOT_TOKEN".into(), self.config.telegram_token.clone()?);
                env.insert("ALLOWED_TELEGRAM_IDS".into(), self.config.telegram_allowed_ids.join(","));
            }
            BridgeType::Discord => {
                env.insert("DISCORD_BOT_TOKEN".into(), self.config.discord_token.clone()?);
                env.insert("ALLOWED_CHANNELS".into(), self.config.discord_channels.join(","));
            }
            // ...
        }
        
        Ok(env)
    }
}
```

**Production hardening:**
- Bridge tokens stored in OS keychain — never in plain config
- Each bridge enforces its own user allowlist — even if the API were exposed, unknown users get no response
- Bridges are stateless — they pass conversation IDs to the API which manages history
- Rate limit per bridge: max 20 messages/minute per user to prevent API abuse
- WhatsApp: use only the official Business API if deploying commercially — unofficial libraries risk account termination

---

## Cross-Cutting Production Standards

These apply to every feature above:

### Logging
```rust
// Use tracing crate throughout
use tracing::{info, warn, error, instrument};

#[instrument(skip(sensitive_data))]
async fn my_function(input: String, sensitive_data: String) {
    info!(input = %input, "Processing request");
    // sensitive_data is skipped from logs by the skip() directive
}
```
Log to rotating files via `tracing-appender`. Max 50MB per file, keep 7 days.

### Error handling
```rust
// Every module has its own typed error enum
// Errors bubble up through ? operator
// At the Tauri command boundary, convert to String for JS
#[tauri::command]
async fn my_command() -> Result<Output, String> {
    inner().await.map_err(|e| e.to_string())
}
```

### Configuration
```rust
// All config lives in a single typed struct
// Loaded from ~/.config/your-app/config.toml on startup
// Written back atomically (write to temp file, rename)
#[derive(Debug, Serialize, Deserialize)]
pub struct AppConfig {
    pub model: ModelConfig,
    pub server: ServerConfig,
    pub bridges: BridgeConfig,
    pub agents: AgentConfig,
    pub tools: ToolConfig,
}
```

### Security
- All secrets in OS keychain via `keyring` crate
- No secrets in config files, environment variables, or logs
- Tauri allowlist: only IPC commands actually needed are exposed — deny by default
- Content Security Policy on Tauri webview: `default-src 'self'`

### Testing
```
Unit tests:      cargo test — all pure Rust logic
Integration:     tests/ — spin up full Tauri app in test mode
E2E:             tauri-driver + WebDriver — test UI flows
Skill tests:     each skill has a test that runs it against a mock executor
Bridge tests:    mock the platform API; verify correct relay behavior
```