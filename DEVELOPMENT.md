# Development Guide

## Project Overview

Mikasa is an AI-powered code generation CLI with voice support and intelligent agent capabilities built with:
- **Frontend**: CLI using Commander.js
- **Backend**: Node.js + Express REST API
- **LLM**: Claude Sonnet 4.5 (primary) + pluggable open-source LLM support
- **Database**: MongoDB Atlas with vector search for semantic retrieval
- **Language**: TypeScript with strict type checking
- **Voice**: OpenAI Whisper for speech-to-text transcription
- **Embeddings**: OpenAI text-embedding-3-small for semantic search

## Project Structure

```
mikasa.ai/
├── src/
│   ├── agent/                    # AI Agent System
│   │   ├── tools/               # Agent tools for code manipulation
│   │   │   ├── base-tool.ts     # Abstract tool interface
│   │   │   ├── file-tool.ts     # File read/write/edit operations
│   │   │   ├── command-tool.ts  # Shell command execution
│   │   │   ├── git-tool.ts      # Git operations (commit, push, PR)
│   │   │   └── index.ts         # Tool exports
│   │   ├── context.ts           # Agent execution context
│   │   ├── planner.ts           # Task planning with LLM
│   │   ├── executor.ts          # Step execution engine
│   │   ├── iterator.ts          # Error recovery and retry logic
│   │   └── index.ts             # Main agent orchestrator
│   │
│   ├── cli/                      # Command Line Interface
│   │   ├── commands/            # CLI commands
│   │   │   ├── init.ts          # Initialize project
│   │   │   ├── run.ts           # Run code generation task
│   │   │   ├── voice.ts         # Voice input recording
│   │   │   ├── status.ts        # Check task status
│   │   │   ├── model.ts         # Model management
│   │   │   └── index.ts         # Command exports
│   │   ├── client/              # API client and session
│   │   │   ├── api-client.ts    # HTTP client for server API
│   │   │   └── session.ts       # Session management
│   │   ├── ui/                  # User interface components
│   │   │   ├── logger.ts        # Console logging with colors
│   │   │   ├── prompts.ts       # User input prompts
│   │   │   └── spinner.ts       # Loading spinners
│   │   └── index.ts             # CLI entry point
│   │
│   ├── server/                   # Express Server
│   │   ├── routes/              # API routes
│   │   │   ├── health.ts        # Health check endpoint
│   │   │   ├── transcribe.ts    # Audio transcription
│   │   │   ├── codegen.ts       # Code generation tasks
│   │   │   ├── checkpoints.ts   # Save/search conversations
│   │   │   ├── git.ts           # PR creation
│   │   │   ├── models.ts        # List available models
│   │   │   └── index.ts         # Route registry
│   │   ├── middleware/          # Express middleware
│   │   │   ├── logger.ts        # Request logging (Winston)
│   │   │   └── error-handler.ts # Global error handler
│   │   ├── services/            # Business logic services
│   │   │   └── stt-service.ts   # Speech-to-text (Whisper/Claude)
│   │   ├── app.ts               # Express app setup
│   │   └── index.ts             # Server entry point
│   │
│   ├── llm/                      # LLM Integration
│   │   ├── providers/           # LLM provider implementations
│   │   │   ├── claude/
│   │   │   │   └── client.ts    # Anthropic Claude client
│   │   │   ├── opensource/
│   │   │   │   └── client.ts    # Open-source LLM client
│   │   │   └── factory.ts       # Provider factory
│   │   ├── base-client.ts       # Abstract LLM client
│   │   └── types.ts             # LLM types
│   │
│   ├── db/                       # Database Layer
│   │   ├── models/              # Mongoose schemas
│   │   │   ├── checkpoint.ts    # Conversation checkpoints with embeddings
│   │   │   ├── session.ts       # User sessions
│   │   │   └── task.ts          # Task records
│   │   ├── repositories/        # Data access layer
│   │   │   └── checkpoint-repo.ts # Checkpoint CRUD + vector search
│   │   ├── services/            # Database services
│   │   │   └── vector-search.ts # OpenAI embeddings + MongoDB vector search
│   │   └── index.ts             # Database connection manager
│   │
│   ├── jobs/                     # Background Jobs
│   │   ├── jobs/                # Job handlers
│   │   │   └── save-checkpoint.ts # Save conversations with embeddings
│   │   ├── queue.ts             # In-memory job queue
│   │   └── worker.ts            # Job worker
│   │
│   └── shared/                   # Shared Utilities
│       ├── types/               # TypeScript types
│       │   ├── config.ts        # Configuration types
│       │   ├── task.ts          # Task types
│       │   ├── session.ts       # Session types
│       │   ├── checkpoint.ts    # Checkpoint types
│       │   └── index.ts         # Type exports
│       ├── utils/               # Utility functions
│       │   ├── config-loader.ts # Load .env and .mikasa.json
│       │   ├── id-generator.ts  # Generate unique IDs
│       │   ├── file-utils.ts    # File system helpers
│       │   └── validation.ts    # Input validation
│       ├── constants.ts         # Global constants
│       └── errors.ts            # Custom error classes
│
├── dist/                         # Compiled JavaScript output
├── node_modules/                 # Dependencies
├── .env                          # Environment variables (not in git)
├── .env.example                  # Example environment config
├── .mikasa.json                  # User configuration (optional)
├── .mikasa.json.example          # Example config file
├── package.json                  # NPM dependencies and scripts
├── tsconfig.json                 # TypeScript config (development)
├── tsconfig.build.json           # TypeScript config (production)
├── README.md                     # User documentation
└── DEVELOPMENT.md                # This file
```

## Architecture

### Component Layers

1. **CLI Layer** (`src/cli/`)
   - User-facing commands (init, run, voice, status, model)
   - Voice input handling with node-record-lpcm16 + SOX
   - Session management (persistent sessions in temp directory)
   - API client for backend communication
   - User approval prompts for code changes

2. **Server Layer** (`src/server/`)
   - Express REST API with CORS and Helmet security
   - Request handling and routing (7 route modules)
   - Middleware (Winston logging, error handling)
   - STT service for audio transcription (Whisper/Claude)

3. **LLM Layer** (`src/llm/`)
   - Abstract base client with streaming support
   - Claude Sonnet 4.5 implementation (Anthropic SDK)
   - Open-source LLM implementation (custom endpoint)
   - Provider factory with auto-selection

4. **Agent Layer** (`src/agent/`)
   - **Planner**: Breaks goals into executable steps using LLM
   - **Executor**: Runs steps using registered tools
   - **Iterator**: Handles errors and automatic retries
   - **Context**: Maintains execution state and logs
   - **Tools**: File, Command, Git operations with safety guards

5. **Data Layer** (`src/db/`)
   - MongoDB models (Checkpoint with embeddings, Session, Task)
   - Repositories for data access (CRUD + semantic search)
   - Vector search service (OpenAI embeddings + MongoDB Atlas)
   - Automatic embedding generation on checkpoint save

6. **Job Queue** (`src/jobs/`)
   - In-memory job queue (simple-queue implementation)
   - Background task processing (non-blocking)
   - Checkpoint saving with embeddings generation
   - Future: Can be replaced with Redis/BullMQ

## Development Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment

```bash
# Windows
copy .env.example .env

# macOS/Linux
cp .env.example .env
```

Edit `.env`:
```env
# LLM Provider API Keys
ANTHROPIC_API_KEY=your_anthropic_api_key_here
OPENAI_API_KEY=your_openai_api_key_here

# Database (MongoDB Atlas recommended)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/mikasa_cli
MONGODB_DB_NAME=mikasa_cli

# Server
SERVER_PORT=3456
SERVER_HOST=localhost

# User
USER_ID=your_username
```

**Important Notes:**
- `.mikasa.json` configuration file will **override** `.env` values
- Remove `database` section from `.mikasa.json` to use `.env` values
- Environment variables are loaded via `dotenv.config()` in config-loader.ts

### 3. Set Up MongoDB Atlas

MongoDB Atlas is recommended for vector search support:

1. Create a free cluster at https://www.mongodb.com/cloud/atlas
2. Create a database user with read/write permissions
3. Add your IP address to Network Access (or `0.0.0.0/0` for development)
4. Get the connection string and update `MONGODB_URI` in `.env`
5. Create a vector search index (see MongoDB Atlas Vector Search Setup section below)

**Alternative: Local MongoDB**
```bash
# Using Docker
docker run -d -p 27017:27017 --name mikasa-mongo mongo:latest

# Or install MongoDB locally
# macOS: brew install mongodb-community
# Windows: Download from mongodb.com

# Update .env
MONGODB_URI=mongodb://localhost:27017/mikasa_cli
```

### 4. Development Workflow

#### Terminal 1: Run Server (Development)
```bash
npm run dev:server
```

This uses `nodemon` with `ts-node` for hot reload.

#### Terminal 2: Run CLI (Development)
```bash
npm run dev:cli init
npm run dev:cli run "your prompt here"
npm run dev:cli voice
npm run dev:cli status <taskId>
```

#### Production Build
```bash
npm run build
npm run start:server  # Run compiled server
npm start             # Run compiled CLI
```

## Code Structure

### TypeScript Configuration

- `tsconfig.json`: Development configuration with strict type checking
- `tsconfig.build.json`: Production build configuration (relaxed checks)

### Entry Points

- **CLI**: `src/cli/index.ts` → `dist/cli/index.js`
- **Server**: `src/server/index.ts` → `dist/server/index.js`

### Key Files

#### Configuration
- `src/shared/utils/config-loader.ts`: Loads `.env` and `.mikasa.json`, merges configs
- `src/shared/types/config.ts`: Configuration type definitions
- `src/shared/constants.ts`: Global constants (ports, paths, limits)

#### LLM Integration
- `src/llm/base-client.ts`: Abstract LLM client with `generateCompletion()` and `streamCompletion()`
- `src/llm/providers/claude/client.ts`: Claude Sonnet 4.5 implementation (Anthropic SDK)
- `src/llm/providers/opensource/client.ts`: Custom LLM endpoint implementation
- `src/llm/providers/factory.ts`: Provider selection based on config

#### Agent System
- `src/agent/index.ts`: Main agent orchestrator, coordinates planner/executor/iterator
- `src/agent/planner.ts`: Task planning with LLM, breaks down prompts into steps
- `src/agent/executor.ts`: Step execution engine, invokes tools
- `src/agent/iterator.ts`: Error recovery logic with retry strategy

#### Tools
- `src/agent/tools/file-tool.ts`: File operations (read, write, edit, delete, list)
- `src/agent/tools/command-tool.ts`: Shell commands with safety checks
- `src/agent/tools/git-tool.ts`: Git operations (status, commit, push, branch, PR via gh CLI)
- `src/agent/tools/base-tool.ts`: Abstract tool interface

#### Database
- `src/db/index.ts`: Database connection manager with Mongoose
- `src/db/models/checkpoint.ts`: Checkpoint schema with `questionEmbedding` and `answerEmbedding`
- `src/db/repositories/checkpoint-repo.ts`: CRUD + semantic search methods
- `src/db/services/vector-search.ts`: OpenAI embeddings + MongoDB Atlas vector search

#### Server Routes
- `src/server/routes/health.ts`: Health check (`GET /api/health`)
- `src/server/routes/transcribe.ts`: Audio transcription (`POST /api/transcribe`)
- `src/server/routes/codegen.ts`: Code generation (`POST /api/codegen`)
- `src/server/routes/checkpoints.ts`: Save/search conversations (`POST /api/checkpoints/save`, `GET /api/checkpoints/search`)
- `src/server/routes/git.ts`: PR creation (`POST /api/git/create-pr`)
- `src/server/routes/models.ts`: List models (`GET /api/models`)

## Adding New Features

### Adding a New Tool

1. Create tool class:

```typescript
// src/agent/tools/my-tool.ts
import { BaseTool, ToolExecutionResult } from './base-tool';

export class MyTool extends BaseTool {
  name = 'my-tool';
  description = 'What this tool does';
  parameters = {
    type: 'object' as const,
    properties: {
      param1: { type: 'string', description: 'Parameter 1' },
    },
    required: ['param1'],
  };

  async execute(params: Record<string, any>): Promise<ToolExecutionResult> {
    // Implementation
    return {
      success: true,
      output: 'Result',
    };
  }
}
```

2. Register in agent:

```typescript
// src/agent/index.ts
import { MyTool } from './tools/my-tool';

this.tools = [
  new FileTool(),
  new CommandTool(),
  new GitTool(),
  new MyTool(), // Add here
];
```

### Adding a New LLM Provider

1. Create provider client:

```typescript
// src/llm/providers/my-provider/client.ts
import { BaseLLMClient } from '../../base-client';
import { CompletionRequest, CompletionResponse } from '../../types';

export class MyProviderClient extends BaseLLMClient {
  name = 'my-provider';

  async generateCompletion(request: CompletionRequest): Promise<CompletionResponse> {
    // Implementation
  }

  async streamCompletion(/* ... */): Promise<CompletionResponse> {
    // Implementation
  }
}
```

2. Update factory:

```typescript
// src/llm/providers/factory.ts
import { MyProviderClient } from './my-provider/client';

export class LLMFactory {
  static create(provider?: string): BaseLLMClient {
    switch (selectedProvider) {
      case 'my-provider':
        return new MyProviderClient(config.llm.providers.myProvider);
      // ...
    }
  }
}
```

3. Update config types:

```typescript
// src/shared/types/config.ts
export interface LLMConfig {
  defaultProvider: 'claude' | 'opensource' | 'my-provider';
  providers: {
    // ...
    myProvider?: MyProviderConfig;
  };
}
```

### Adding a New CLI Command

1. Create command handler:

```typescript
// src/cli/commands/my-command.ts
import { Logger } from '../ui/logger';

export async function myCommand(options: any): Promise<void> {
  Logger.info('Running my command');
  // Implementation
}
```

2. Register in CLI:

```typescript
// src/cli/index.ts
import { myCommand } from './commands/my-command';

program
  .command('my-command')
  .description('Description')
  .option('-o, --option <value>', 'Option description')
  .action(myCommand);
```

### Adding a Background Job

1. Create job handler:

```typescript
// src/jobs/jobs/my-job.ts
export async function myJobHandler(data: any): Promise<void> {
  // Process job
}
```

2. Register in worker:

```typescript
// src/jobs/worker.ts
import { myJobHandler } from './jobs/my-job';

export function initializeWorker(): void {
  registerJobHandler('my-job', myJobHandler);
}
```

3. Enqueue job:

```typescript
import { enqueueJob } from '../jobs/queue';

enqueueJob('my-job', { /* data */ });
```

## Testing

### Unit Tests

```bash
npm test
```

### Manual Testing

1. Start server:
```bash
npm run dev:server
```

2. Test health endpoint:
```bash
curl http://localhost:3456/api/health
```

3. Test code generation:
```bash
npm run dev:cli run "Create a hello world function"
```

4. Check logs in server terminal

## Debugging

### Enable Debug Logging

```bash
DEBUG=* npm run dev:server
```

### VS Code Debug Configuration

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Server",
      "program": "${workspaceFolder}/src/server/index.ts",
      "preLaunchTask": "tsc: build - tsconfig.json",
      "outFiles": ["${workspaceFolder}/dist/**/*.js"],
      "runtimeArgs": ["-r", "ts-node/register"]
    }
  ]
}
```

## Common Issues

### MongoDB Connection Failed

**Issue**: Server starts but shows "Database connection failed"

**Solutions**:
1. Verify MongoDB is running (Atlas cluster is active or local MongoDB is running)
2. Check `MONGODB_URI` in `.env` has correct format:
   - Atlas: `mongodb+srv://username:password@cluster.mongodb.net/database_name`
   - Local: `mongodb://localhost:27017/database_name`
3. Remove `database` section from `.mikasa.json` to use `.env` values
4. Rebuild project: `npm run build`
5. Check Network Access in MongoDB Atlas (whitelist your IP or use `0.0.0.0/0`)
6. Verify database user credentials in Atlas

### Claude API Error

**Issue**: "Claude API key is required"

**Solution**:
- Set `ANTHROPIC_API_KEY` in `.env`
- Or add to `.mikasa.json`: `llm.providers.claude.apiKey`
- Get API key from https://console.anthropic.com/

### Tool Execution Failed

**Issue**: File/Command/Git tool returns errors

**Solution**:
- Check file paths are relative to working directory
- Verify shell commands are safe (dangerous commands are blocked)
- Ensure GitHub CLI (`gh`) is installed for PR creation: `gh auth login`

### Voice Recording Not Working

**Issue**: Voice command fails

**Solution**:
- **Windows**: Install SOX from https://sourceforge.net/projects/sox/
- **macOS**: `brew install sox`
- **Linux**: `sudo apt-get install sox`
- Verify microphone permissions

## Performance Tips

1. **Reduce LLM Token Usage**
   - Lower `maxTokens` in config
   - Use more specific prompts

2. **Optimize Agent Iterations**
   - Reduce `maxRetries` for faster failures
   - Tune `maxIterations` based on task complexity

3. **Database Performance**
   - Add indexes for frequently queried fields
   - Use connection pooling (already configured)
   - Limit semantic search results

4. **Build Performance**
   - Production build excludes tests and source maps
   - Clean dist folder: `rm -rf dist && npm run build`

## MongoDB Atlas Vector Search Setup

To enable semantic search, create a vector search index in MongoDB Atlas:

1. Go to your MongoDB Atlas cluster
2. Navigate to "Search" → "Create Search Index"
3. Select "JSON Editor"
4. Database: `mikasa_cli`, Collection: `checkpoints`
5. Use this configuration:

```json
{
  "name": "checkpoint_vector_index",
  "type": "vectorSearch",
  "definition": {
    "fields": [
      {
        "type": "vector",
        "path": "questionEmbedding",
        "numDimensions": 1536,
        "similarity": "cosine"
      },
      {
        "type": "vector",
        "path": "answerEmbedding",
        "numDimensions": 1536,
        "similarity": "cosine"
      }
    ]
  }
}
```

**Note**: OpenAI's `text-embedding-3-small` model generates 1536-dimensional vectors.

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make changes and test thoroughly
4. Commit: `git commit -m "Add my feature"`
5. Push: `git push origin feature/my-feature`
6. Create Pull Request

## Release Process

1. Update version in `package.json`
2. Build: `npm run build`
3. Test production build: `node dist/cli/index.js --version`
4. Commit and tag: `git tag v1.0.0`
5. Push: `git push --tags`
6. Publish: `npm publish`

## Architecture Decisions

### Why Express instead of Fastify?
- Mature ecosystem
- Better middleware support
- Familiar to most developers

### Why MongoDB instead of PostgreSQL?
- Flexible schema for evolving checkpoint structure
- JSON-native storage
- Native vector search support (Atlas)
- Easier scaling for logs and large text fields

### Why In-Memory Job Queue?
- Simple implementation for MVP
- No external dependencies
- Can be replaced with Redis/BullMQ later

### Why Commander.js?
- Industry standard for Node.js CLIs
- Rich feature set
- Good documentation

### Why Mongoose instead of raw MongoDB driver?
- Schema validation and type safety
- Middleware hooks (for embedding generation)
- Better TypeScript support

## Implemented Features

- [x] Voice recording with SOX
- [x] Whisper integration for voice transcription
- [x] MongoDB vector search for semantic retrieval
- [x] User approval flow for code changes
- [x] Automatic PR creation with GitHub CLI
- [x] Background job queue for checkpoint saving
- [x] OpenAI embeddings for semantic search
- [x] Multi-step task planning with LLM
- [x] Error recovery and automatic retries
- [x] Session management with persistence
- [x] Claude Sonnet 4.5 integration
- [x] Git operations (commit, push, PR)
- [x] File operations (read, write, edit)
- [x] Shell command execution with safety
- [x] Express REST API with 7 endpoints
- [x] Configuration system (.env + .mikasa.json)

## Future Enhancements

- [ ] Web dashboard for session management
- [ ] Plugin system for custom tools
- [ ] Multi-user support with authentication
- [ ] Streaming responses in CLI
- [ ] Cost tracking and optimization
- [ ] IDE extensions (VS Code, JetBrains)
- [ ] Local Whisper model support (whisper.cpp)
- [ ] Alternative embedding models (sentence-transformers)
- [ ] Redis-based job queue (BullMQ)
- [ ] Docker containerization
- [ ] CI/CD pipeline
- [ ] Comprehensive test coverage

## Support

- GitHub Issues: [Report bugs](https://github.com/yourusername/mikasa/issues)
- Documentation: Coming soon
- Discord: Coming soon
