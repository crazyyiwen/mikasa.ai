# Development Guide

## Project Overview

Mikasa is a voice-controlled and prompt input code generator CLI built with:
- **Frontend**: CLI using Commander.js
- **Backend**: Node.js + Express
- **LLM**: Claude Code (primary) + pluggable open-source LLM support
- **Database**: MongoDB for session/checkpoint persistence
- **Language**: TypeScript

## Architecture

### Component Layers

1. **CLI Layer** (`src/cli/`)
   - User-facing commands
   - Voice input handling
   - Session management
   - API client for backend communication

2. **Server Layer** (`src/server/`)
   - Express REST API
   - Request handling and routing
   - Middleware (logging, error handling)

3. **LLM Layer** (`src/llm/`)
   - Abstract base client
   - Claude implementation
   - Open-source LLM implementation
   - Provider factory

4. **Agent Layer** (`src/agent/`)
   - **Planner**: Breaks goals into steps
   - **Executor**: Runs steps using tools
   - **Iterator**: Handles errors and retries
   - **Tools**: File, Command, Git operations

5. **Data Layer** (`src/db/`)
   - MongoDB models (Checkpoint, Session, Task)
   - Repositories for data access

6. **Job Queue** (`src/jobs/`)
   - Background task processing
   - Checkpoint saving
   - Non-blocking operations

## Development Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment

```bash
cp .env.example .env
```

Edit `.env`:
```env
ANTHROPIC_API_KEY=sk-ant-xxx
MONGODB_URI=mongodb://localhost:27017/mikasa
SERVER_PORT=3456
SERVER_HOST=localhost
USER_ID=your_username
```

### 3. Start MongoDB

```bash
# Using Docker
docker run -d -p 27017:27017 --name mikasa-mongo mongo:latest

# Or install MongoDB locally
# macOS: brew install mongodb-community
# Windows: Download from mongodb.com
```

### 4. Development Workflow

#### Terminal 1: Run Server
```bash
npm run dev:server
```

#### Terminal 2: Run CLI
```bash
npm run dev:cli init
npm run dev:cli run "your prompt here"
```

## Code Structure

### TypeScript Configuration

- `tsconfig.json`: Development configuration
- `tsconfig.build.json`: Production build configuration

### Entry Points

- **CLI**: `src/cli/index.ts`
- **Server**: `src/server/index.ts`

### Key Files

#### Configuration
- `src/shared/utils/config-loader.ts`: Loads `.mikasa.json` and environment variables
- `src/shared/types/config.ts`: Configuration type definitions

#### LLM Integration
- `src/llm/base-client.ts`: Abstract LLM client
- `src/llm/providers/claude/client.ts`: Claude implementation
- `src/llm/providers/factory.ts`: Provider selection

#### Agent System
- `src/agent/index.ts`: Main agent orchestrator
- `src/agent/planner.ts`: Task planning with LLM
- `src/agent/executor.ts`: Step execution
- `src/agent/iterator.ts`: Error recovery logic

#### Tools
- `src/agent/tools/file-tool.ts`: File operations
- `src/agent/tools/command-tool.ts`: Shell commands
- `src/agent/tools/git-tool.ts`: Git operations

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
      "outFiles": ["${workspaceFolder}/dist/**/*.js"]
    }
  ]
}
```

## Common Issues

### MongoDB Connection Failed

**Issue**: Server starts but shows "Database connection failed"

**Solution**:
- Ensure MongoDB is running: `docker ps` or `brew services list mongodb-community`
- Check MONGODB_URI in `.env`
- MongoDB can be optional; server will run without it

### Claude API Error

**Issue**: "Claude API key is required"

**Solution**:
- Set `ANTHROPIC_API_KEY` in `.env`
- Or add to `.mikasa.json`: `llm.providers.claude.apiKey`

### Tool Execution Failed

**Issue**: File/Command/Git tool returns errors

**Solution**:
- Check file paths are relative to working directory
- Verify shell commands are safe (dangerous commands are blocked)
- Ensure GitHub CLI (`gh`) is installed for PR creation

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
- Easier scaling for logs and large text fields

### Why In-Memory Job Queue?
- Simple implementation for MVP
- No external dependencies
- Can be replaced with Redis/BullMQ later

### Why Commander.js?
- Industry standard for Node.js CLIs
- Rich feature set
- Good documentation

## Implemented Features

- [x] Voice recording with SOX
- [x] Whisper integration for voice transcription
- [x] MongoDB vector search for semantic retrieval
- [x] User approval flow for code changes
- [x] Automatic PR creation with GitHub CLI
- [x] Background job queue for checkpoint saving
- [x] OpenAI embeddings for semantic search

## Future Enhancements

- [ ] Web dashboard for session management
- [ ] Plugin system for custom tools
- [ ] Multi-user support with authentication
- [ ] Streaming responses in CLI
- [ ] Cost tracking and optimization
- [ ] IDE extensions (VS Code, JetBrains)
- [ ] Local Whisper model support (whisper.cpp)
- [ ] Alternative embedding models (sentence-transformers)

## Support

- GitHub Issues: [Report bugs](https://github.com/yourusername/mikasa/issues)
- Documentation: Coming soon
- Discord: Coming soon
