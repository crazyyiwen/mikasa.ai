# Mikasa 🗡️

AI-powered code generation CLI with voice support and intelligent agent capabilities.

## Features

- 🎙️ **Voice Input**: Speak your coding requests with audio transcription via Whisper
- 🤖 **Smart Agent**: Multi-step task planning and execution with automatic error recovery
- 🔧 **Tool System**: File operations, shell commands, and Git integration
- 🧠 **Multiple LLM Support**: Claude Code (primary) and open-source LLM integration
- 💾 **Session Management**: Persistent conversation history and checkpoints
- 🔄 **Background Processing**: Non-blocking task execution
- 📊 **MongoDB Vector Search**: Semantic search across conversation history
- 🔍 **Intelligent Search**: Find similar past conversations using embeddings
- ✅ **User Approval**: Review and approve code changes before applying
- 🔀 **Auto PR Creation**: Automatically create pull requests on GitHub

## Quick Start

### Prerequisites

- Node.js >= 18.0.0
- MongoDB Atlas (for vector search) or local MongoDB
- OpenAI API key (for Whisper transcription and embeddings)
- Anthropic API key (for Claude Code)
- GitHub CLI (`gh`) for PR creation (optional)
- SOX (for voice recording on Windows/macOS)

### Installation

```bash
npm install
npm run build
```

### Configuration

1. Create a `.env` file:

```bash
cp .env.example .env
```

2. Add your API keys:

```env
# Required
ANTHROPIC_API_KEY=your_claude_api_key_here
OPENAI_API_KEY=your_openai_api_key_here

# MongoDB (required for persistence and vector search)
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/
MONGODB_DB_NAME=mikasa_cli

# Server
SERVER_PORT=3456
SERVER_HOST=localhost

# User
USER_ID=your_username
```

3. Create a `.mikasa.json` file:

```bash
cp .mikasa.json.example .mikasa.json
```

4. Initialize Mikasa:

```bash
npm run dev:cli init
```

### Start the Server

```bash
# Development
npm run dev:server

# Production
npm run start:server
```

The server will start on `http://localhost:3456` by default.

## Usage

### Text Input

Run code generation with a text prompt:

```bash
npm run dev:cli run "Create a REST API endpoint for user authentication"
```

Options:
- `-m, --model <model>`: Specify LLM model
- `-a, --autonomous`: Enable fully autonomous mode

### Voice Input

Record your coding request with voice:

```bash
npm run dev:cli voice
```

This will:
1. Start recording audio from your microphone
2. Stop when you press Ctrl+C
3. Transcribe the audio using OpenAI Whisper
4. Display the transcription for your review
5. Execute the code generation if you confirm

### Check Task Status

```bash
npm run dev:cli status <taskId>
```

### Model Management

```bash
npm run dev:cli model list
npm run dev:cli model set claude-sonnet-4-5-20250929
```

## Architecture

```
┌─────────────┐
│  CLI Layer  │ ← User interaction
└──────┬──────┘
       │
┌──────▼───────┐
│ Express API  │ ← HTTP endpoints
└──────┬───────┘
       │
┌──────▼───────┐
│  LLM Layer   │ ← Claude / Open-source
└──────┬───────┘
       │
┌──────▼───────┐
│ Smart Agent  │ ← Planning, execution, iteration
└──────┬───────┘
       │
┌──────▼───────────────────┐
│ Tools: File, Cmd, Git    │ ← Actions
└──────────────────────────┘
```

## How It Works

### Agent Workflow

1. **Planning**: LLM breaks down your goal into executable steps
2. **Execution**: Agent runs each step using available tools
3. **Iteration**: On errors, agent analyzes and retries with fixes
4. **Finalization**: Results saved to MongoDB, optional PR creation

### Tools

- **File Tool**: Read, write, and patch files
- **Command Tool**: Execute shell commands (npm, build, test, etc.)
- **Git Tool**: Git operations (status, commit, branch, push, PR)

## Development

### Project Structure

```
mikasa/
├── src/
│   ├── cli/          # CLI commands and UI
│   ├── server/       # Express backend
│   ├── llm/          # LLM abstraction layer
│   ├── agent/        # Smart agent (planner, executor, iterator)
│   ├── db/           # MongoDB models
│   ├── jobs/         # Background jobs
│   └── shared/       # Shared utilities
└── dist/             # Compiled output
```

### Build

```bash
npm run build
```

### Development Mode

```bash
npm run dev:cli
npm run dev:server
```

## Example Configuration (.mikasa.json)

```json
{
  "llm": {
    "defaultProvider": "claude",
    "providers": {
      "claude": {
        "model": "claude-sonnet-4-5-20250929",
        "maxTokens": 4096,
        "temperature": 0.7
      }
    }
  },
  "agent": {
    "maxIterations": 10,
    "maxRetries": 3,
    "enabledTools": ["file", "command", "git"],
    "safety": {
      "allowShellCommands": true,
      "allowGitPush": true,
      "allowFileDelete": false
    }
  }
}
```

## API Endpoints

### Health Check
```
GET /api/health
```

### Audio Transcription
```
POST /api/transcribe
Content-Type: multipart/form-data

{
  "audio": <audio file>,
  "format": "wav"
}
```

### Code Generation
```
POST /api/codegen
{
  "prompt": "Your coding request",
  "sessionId": "session-xxx",
  "userId": "user-xxx",
  "model": "claude-sonnet-4-5-20250929",
  "context": {
    "workingDirectory": "/path/to/project"
  },
  "options": {
    "autonomous": false,
    "maxIterations": 10
  }
}
```

### Task Status
```
GET /api/tasks/:taskId
```

### Save Checkpoint
```
POST /api/checkpoints/save
{
  "taskId": "task-xxx",
  "checkPointId": "checkpoint-xxx",
  "sessionId": "session-xxx"
}
```

### Search Checkpoints (Semantic)
```
GET /api/checkpoints/search?query=authentication&userId=user-xxx&limit=10
```

### Get Checkpoints
```
GET /api/checkpoints?userId=user-xxx&sessionId=session-xxx
```

### Create Pull Request
```
POST /api/git/create-pr
{
  "taskId": "task-xxx",
  "sessionId": "session-xxx"
}
```

### List Models
```
GET /api/models
```

## Implementation Status

✅ **Phase 1**: Project structure, TypeScript, configuration
✅ **Phase 2**: Voice recording and STT (Whisper)
✅ **Phase 3**: LLM abstraction (Claude + OpenSource)
✅ **Phase 4**: Agent tools (File, Command, Git)
✅ **Phase 5**: Smart agent (Planner, Executor, Iterator)
✅ **Phase 6**: MongoDB models with vector search and background jobs
✅ **Phase 7**: User approval flow and PR creation
⏳ **Phase 8**: Testing and polish - In progress

## MongoDB Atlas Vector Search Setup

To enable semantic search, create a vector search index in MongoDB Atlas:

1. Go to your MongoDB Atlas cluster
2. Navigate to "Search" → "Create Search Index"
3. Select "JSON Editor"
4. Use this configuration:

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
      }
    ]
  }
}
```

## Workflow Example

1. **Start the server**:
   ```bash
   npm run dev:server
   ```

2. **Use voice input** (or text):
   ```bash
   npm run dev:cli voice
   # Or
   npm run dev:cli run "Add user authentication with JWT"
   ```

3. **Review results**:
   - View modified files
   - Approve or reject changes

4. **Save conversation** (optional):
   - Conversation is automatically saved to MongoDB
   - Can be searched later using semantic search

5. **Create PR** (optional):
   - Automatically creates a new branch
   - Commits changes
   - Creates pull request on GitHub

## Advanced Features

### Semantic Search

Search through your conversation history using natural language:

```bash
curl "http://localhost:3456/api/checkpoints/search?query=how%20to%20implement%20authentication&userId=user-xxx"
```

This uses OpenAI embeddings and MongoDB Atlas vector search to find similar past conversations.

### Background Processing

All code generation tasks run in the background, allowing you to:
- Continue using the CLI while tasks execute
- Check task status at any time
- Save results asynchronously to MongoDB

### Safety Features

Configure safety settings in `.mikasa.json`:

```json
{
  "agent": {
    "safety": {
      "allowShellCommands": true,
      "allowGitPush": true,
      "allowFileDelete": false
    }
  }
}
```

## Troubleshooting

### Voice recording not working
- **Windows**: Install SOX from https://sourceforge.net/projects/sox/
- **macOS**: `brew install sox`
- **Linux**: `sudo apt-get install sox`

### MongoDB connection issues
- Ensure MongoDB is running (local or Atlas)
- Check your `MONGODB_URI` in `.env`
- Verify network connectivity to MongoDB Atlas

### GitHub CLI not found
- Install from https://cli.github.com/
- Authenticate with `gh auth login`

### Vector search not working
- Ensure you've created the vector search index in MongoDB Atlas
- Check that embeddings are being generated (requires OpenAI API key)
- Fallback to text search is automatic if vector search fails

## License

MIT
