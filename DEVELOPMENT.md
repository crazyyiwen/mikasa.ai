# Development Guide

## Project Overview

Mikasa is an AI-powered code generation CLI with voice support and intelligent agent capabilities. It provides a Claude Code-style interactive REPL experience for natural language code generation, with preview/apply workflow, background job processing, and MongoDB-based vector search for context retrieval.

## Architecture

The system follows a layered architecture with six main components:

### 1. CLI Layer ([src/cli/](src/cli/))
- **Interactive REPL** ([src/cli/commands/interactive.ts](src/cli/commands/interactive.ts)) - Claude Code-style conversational interface
- **API Client** ([src/cli/client/api-client.ts](src/cli/client/api-client.ts)) - HTTP client for server communication
- **Voice Commands** ([src/cli/commands/voice.ts](src/cli/commands/voice.ts)) - Voice recording and transcription

### 2. Server Layer ([src/server/](src/server/))
- **Express Server** ([src/server/index.ts](src/server/index.ts)) - Entry point with global error handlers
- **Routes** ([src/server/routes/](src/server/routes/)) - RESTful API endpoints
- **Middleware** ([src/server/middleware/](src/server/middleware/)) - Logger, error handler, request validation

### 3. LLM Layer ([src/llm/](src/llm/))
- **Anthropic Client** ([src/llm/anthropic-client.ts](src/llm/anthropic-client.ts)) - Claude API integration
- **Embedding Service** ([src/llm/embedding-service.ts](src/llm/embedding-service.ts)) - Vector embedding generation
- **Transcription** ([src/llm/transcription.ts](src/llm/transcription.ts)) - Voice-to-text conversion

### 4. Agent Layer ([src/agent/](src/agent/))
- **Planner** ([src/agent/planner.ts](src/agent/planner.ts)) - Generates execution plans
- **Executor** ([src/agent/executor.ts](src/agent/executor.ts)) - Executes plans step-by-step
- **Iterator** ([src/agent/iterator.ts](src/agent/iterator.ts)) - Iterative refinement
- **Tools** ([src/agent/tools/](src/agent/tools/)) - File, Command, Git operations

### 5. Data Layer ([src/db/](src/db/))
- **MongoDB Models** ([src/db/models/](src/db/models/)) - Task, Checkpoint schemas
- **Vector Search** ([src/db/repositories/](src/db/repositories/)) - Semantic similarity search

### 6. Job Queue ([src/jobs/](src/jobs/))
- **Worker** ([src/jobs/worker.ts](src/jobs/worker.ts)) - Background checkpoint saving
- **Async Processing** - Non-blocking task persistence

## Data Flow

```
User Input → CLI (REPL/Voice) → Server API → LLM (Plan Generation)
→ Agent (Preview Mode) → User Approval → Agent (Execution)
→ Tools (File/Git/Command) → Filesystem → Result
```

### Key Workflows

**1. Interactive Code Generation**
```
interactive.ts → /api/codegen/stream → planner.ts → executor.ts (preview=true)
→ CLI displays preview → User types "y" → /api/codegen/apply
→ executor.ts (preview=false) → file-tool.ts/git-tool.ts → Changes applied
```

**2. Voice Input**
```
voice.ts → record-lpcm16 → audio buffer → /api/voice/transcribe
→ transcription.ts → Claude API → text → /api/codegen/stream
```

**3. Context Retrieval**
```
User message → embedding-service.ts → vector → checkpoint-repository.ts
→ MongoDB Atlas Vector Search → relevant checkpoints → planner.ts context
```

## Core Components

### CLI Components

#### [src/cli/commands/interactive.ts](src/cli/commands/interactive.ts)
Claude Code-style REPL with streaming responses and preview/apply workflow.

**Key Features:**
- Line-by-line streaming from server
- Preview mode with approval prompt
- Session and user ID persistence
- Ctrl+C graceful exit

**Code Snippet:**
```typescript
// Lines 89-103: Preview approval prompt
if (line.includes('[PREVIEW]')) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const answer = await new Promise<string>((resolve) => {
    rl.question(chalk.yellow('\nApply these code changes? (Y/n): '), (ans) => {
      rl.close();
      resolve(ans.toLowerCase());
    });
  });

  if (answer === 'y' || answer === 'yes' || answer === '') {
    await applyChanges(taskId);
  }
}
```

#### [src/cli/client/api-client.ts](src/cli/client/api-client.ts)
HTTP client for server communication with streaming support.

**Endpoints:**
- `streamCodegen()` - Stream task execution with SSE
- `applyChanges()` - Apply approved changes
- `transcribeAudio()` - Voice-to-text conversion

### Server Components

#### [src/server/index.ts](src/server/index.ts)
Server entry point with critical global error handlers.

**Key Features:**
- Error handlers set BEFORE imports (lines 6-14)
- MongoDB connection with fallback to in-memory
- Job worker initialization
- Graceful shutdown handling

**Code Snippet:**
```typescript
// Lines 6-14: Global error handlers
process.on('uncaughtException', (error) => {
  console.error('UNCAUGHT EXCEPTION:', error);
  // Don't exit - keep server running
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION at:', promise, 'reason:', reason);
  // Don't exit - keep server running
});
```

#### [src/server/routes/codegen.ts](src/server/routes/codegen.ts)
Code generation API with preview/apply workflow.

**Endpoints:**
- `POST /api/codegen/stream` - Stream task execution
- `POST /api/codegen/apply/:taskId` - Apply approved changes
- `GET /api/codegen/status/:taskId` - Check task status

**Code Snippet:**
```typescript
// Lines 113-119: Async execution with error handling
executeApprovedPlan(taskId, task.prompt, task.model, task.context?.workingDirectory, task.options)
  .catch((error) => {
    logger.error(`Failed to execute approved plan for task ${taskId}:`, error);
    task.status = 'failed';
    task.error = error.message;
    task.progress.currentAction = 'Failed to apply changes';
  });
```

### Agent Components

#### [src/agent/planner.ts](src/agent/planner.ts)
Generates execution plans using Claude with tool calling.

**Key Features:**
- Context retrieval from vector search
- File tree analysis
- Git status integration
- Structured plan output

#### [src/agent/executor.ts](src/agent/executor.ts)
Executes plans step-by-step with tool invocation.

**Key Features:**
- Preview mode (dry run without side effects)
- Tool execution (file, command, git)
- Progress tracking
- Error recovery

**Code Snippet:**
```typescript
// Lines 88-102: Preview mode logic
if (step.tool === 'file') {
  if (this.preview && (step.action === 'write' || step.action === 'patch')) {
    result = `[PREVIEW] Would ${step.action} file: ${step.path}`;
    if (step.action === 'write') {
      result += `\n\nContent:\n${step.content}`;
    } else if (step.action === 'patch') {
      result += `\n\nPatches:\n${JSON.stringify(step.patches, null, 2)}`;
    }
  } else {
    result = await this.fileToolHandler.execute(step);
  }
}
```

#### [src/agent/tools/file-tool.ts](src/agent/tools/file-tool.ts)
File operations (read, write, patch) with Windows path handling.

**Actions:**
- `read` - Read file contents
- `write` - Create or overwrite files
- `patch` - Apply line-based modifications

#### [src/agent/tools/git-tool.ts](src/agent/tools/git-tool.ts)
Git operations with Windows reserved name filtering.

**Key Features:**
- Status checking
- File staging (with Windows reserved name filtering)
- Commit creation
- PR creation via GitHub CLI

**Code Snippet:**
```typescript
// Lines 170-185: Windows reserved name filtering
const WINDOWS_RESERVED = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'LPT1', 'LPT2', 'LPT3'];
const validFiles = filesToAdd.filter(file => {
  const fileName = file.split(/[/\\]/).pop()?.toUpperCase();
  return fileName && !WINDOWS_RESERVED.includes(fileName);
});

if (validFiles.length === 0) {
  return {
    success: false,
    output: 'No valid files to commit',
    error: 'All files are invalid or Windows reserved names',
  };
}

// Stage only valid files
await this.git.add(validFiles);
```

#### [src/agent/tools/command-tool.ts](src/agent/tools/command-tool.ts)
Shell command execution with security constraints.

**Security Features:**
- Command whitelist enforcement
- Working directory validation
- Timeout protection (30s default)

### Database Components

#### [src/db/models/task.ts](src/db/models/task.ts)
Task schema with progress tracking.

**Schema:**
```typescript
{
  taskId: string;
  userId: string;
  sessionId: string;
  prompt: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  plan?: TaskPlan;
  result?: string;
  error?: string;
  progress: {
    currentStep: number;
    totalSteps: number;
    currentAction: string;
  };
}
```

#### [src/db/models/checkpoint.ts](src/db/models/checkpoint.ts)
Checkpoint schema with vector embeddings.

**Schema:**
```typescript
{
  checkpointId: string;
  taskId: string;
  stepNumber: number;
  stepDescription: string;
  result: string;
  embedding: number[]; // 1024-dimensional vector
  metadata: {
    filesChanged: string[];
    commandsRun: string[];
  };
}
```

#### [src/db/repositories/checkpoint-repository.ts](src/db/repositories/checkpoint-repository.ts)
Vector search using MongoDB Atlas Search.

**Key Features:**
- Semantic similarity search via `$vectorSearch`
- Embedding-based retrieval
- Top-k results (default: 5)

**Code Snippet:**
```typescript
// Lines 32-43: Vector search aggregation
const results = await CheckpointModel.aggregate([
  {
    $vectorSearch: {
      index: 'checkpoint_vector_index',
      path: 'embedding',
      queryVector: embedding,
      numCandidates: 100,
      limit: options.topK || 5,
    },
  },
]);
```

### Job Queue Components

#### [src/jobs/worker.ts](src/jobs/worker.ts)
Background worker for checkpoint saving.

**Key Features:**
- Queue-based async processing
- Embedding generation
- Non-blocking task persistence

## Configuration

### [nodemon.json](nodemon.json)
Critical configuration to prevent server restarts during code generation.

**Purpose:** Prevents nodemon from restarting when agent creates files in code generation directories.

**Configuration:**
```json
{
  "watch": ["src/server", "src/shared", "src/db", "src/jobs"],
  "ignore": [
    "src/cli/**",
    "src/agent/tools/**",
    "src/utils/**",
    "*.test.ts",
    "*.test.js",
    "dist/**",
    "node_modules/**"
  ],
  "ext": "ts,json",
  "exec": "ts-node src/server/index.ts"
}
```

### [.env.example](.env.example)
Environment variables template.

**Required Variables:**
- `ANTHROPIC_API_KEY` - Claude API key
- `MONGODB_URI` - MongoDB connection string (optional)
- `SERVER_PORT` - Server port (default: 3456)

## API Reference

### Code Generation Endpoints

#### `POST /api/codegen/stream`
Stream task execution with Server-Sent Events.

**Request:**
```typescript
{
  prompt: string;
  model?: 'claude-3-5-sonnet-20241022' | 'claude-3-opus-20240229';
  context?: {
    workingDirectory?: string;
    sessionId?: string;
    userId?: string;
  };
  options?: {
    preview?: boolean;
    maxIterations?: number;
  };
}
```

**Response:** SSE stream with `data:` lines containing JSON progress updates.

#### `POST /api/codegen/apply/:taskId`
Apply approved changes from preview mode.

**Response:**
```typescript
{
  message: string;
  taskId: string;
}
```

### Voice Endpoints

#### `POST /api/voice/transcribe`
Transcribe audio to text.

**Request:** multipart/form-data with `audio` file
**Response:**
```typescript
{
  text: string;
  success: boolean;
}
```

## Error Handling

### Global Error Handlers ([src/server/index.ts](src/server/index.ts#L6-L14))
Catch all uncaught exceptions and unhandled rejections to prevent server crashes.

**Critical:** Error handlers MUST be set BEFORE any imports to catch errors during module initialization.

### Route Error Handling
All routes use try-catch blocks with logging and proper HTTP status codes.

### Tool Error Handling
All tool executions return `{ success: boolean, output?: string, error?: string }` for graceful error recovery.

## Recent Improvements

### 1. Interactive REPL Mode
- Claude Code-style continuous conversation
- Streaming responses with progress updates
- Session persistence across interactions

### 2. Preview/Apply Workflow
- Two-phase execution: plan generation → user approval → execution
- Preview mode shows changes without applying them
- User can approve or reject changes

### 3. Global Error Handlers
- Moved error handlers BEFORE imports in [src/server/index.ts](src/server/index.ts#L6-L14)
- Server stays running even on uncaught exceptions
- Proper logging for debugging

### 4. Nodemon Configuration
- Created [nodemon.json](nodemon.json) to prevent server restarts
- Only watches server-related directories
- Ignores code generation targets

### 5. Auto Port Cleanup
- [scripts/kill-server.js](scripts/kill-server.js) automatically runs before server starts
- Prevents "port already in use" errors
- Windows-compatible using netstat and taskkill

### 6. Windows Reserved Name Filtering
- [src/agent/tools/git-tool.ts](src/agent/tools/git-tool.ts#L170-L185) filters out CON, NUL, etc.
- Prevents git errors with reserved filenames
- Selective file staging instead of `git add .`

## Development Workflow

### Setup
```bash
npm install
cp .env.example .env
# Edit .env with your ANTHROPIC_API_KEY
```

### Development
```bash
# Terminal 1: Start server with auto-reload
npm run dev:server

# Terminal 2: Run CLI in interactive mode
npm run dev:cli
```

### Testing
```bash
# Run all tests
npm test

# Watch mode
npm test:watch
```

### Building
```bash
# Compile TypeScript
npm run build

# Run production build
npm start
```

## Debugging

### Server Logs
Server uses Winston logger with console and file transports. Check `logs/` directory for detailed logs.

### CLI Debugging
Set `DEBUG=*` environment variable for verbose output.

### Common Issues

**1. Server crashes on code approval**
- **Cause:** Nodemon restarting due to file changes
- **Fix:** Ensure [nodemon.json](nodemon.json) is configured correctly

**2. Port already in use**
- **Cause:** Orphaned server process
- **Fix:** Run `npm run kill-server`

**3. MongoDB connection failed**
- **Cause:** Invalid connection string or network issues
- **Fix:** Server runs without persistence (in-memory mode)

**4. Git errors with reserved names**
- **Cause:** Windows reserved filenames (CON, NUL, etc.)
- **Fix:** Automatic filtering in [git-tool.ts](src/agent/tools/git-tool.ts#L170-L185)

## Project Structure

```
mikasa.ai/
├── src/
│   ├── cli/               # CLI layer
│   │   ├── commands/      # Interactive, voice commands
│   │   ├── client/        # API client
│   │   └── index.ts       # CLI entry point
│   ├── server/            # Server layer
│   │   ├── routes/        # API routes
│   │   ├── middleware/    # Express middleware
│   │   └── index.ts       # Server entry point
│   ├── agent/             # Agent layer
│   │   ├── tools/         # File, Git, Command tools
│   │   ├── planner.ts     # Plan generation
│   │   ├── executor.ts    # Plan execution
│   │   └── iterator.ts    # Iterative refinement
│   ├── llm/               # LLM layer
│   │   ├── anthropic-client.ts
│   │   ├── embedding-service.ts
│   │   └── transcription.ts
│   ├── db/                # Data layer
│   │   ├── models/        # Mongoose schemas
│   │   └── repositories/  # Data access
│   ├── jobs/              # Job queue
│   │   └── worker.ts
│   └── shared/            # Shared utilities
│       ├── types/
│       └── utils/
├── scripts/
│   └── kill-server.js     # Port cleanup
├── nodemon.json           # Nodemon config
├── package.json           # Dependencies
└── tsconfig.json          # TypeScript config
```

## Next Steps

- [ ] Add unit tests for all agent tools
- [ ] Implement retry logic for LLM API failures
- [ ] Add support for multi-file preview diffs
- [ ] Improve context retrieval with re-ranking
- [ ] Add telemetry for agent performance monitoring
- [ ] Implement cost tracking for LLM API usage

## Contributing

1. Create a feature branch
2. Make changes
3. Run tests: `npm test`
4. Run linter: `npm run lint`
5. Format code: `npm run format`
6. Submit PR

## Quick Start

```bash
# Run the interactive CLI
npm run dev:cli

# Example prompts:
# "write a simple add function"
# "create a REST API endpoint for user authentication"
# "add tests for the authentication module"
```

---

Generated with Mikasa AI - AI-powered code generation with voice support
