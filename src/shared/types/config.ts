/**
 * Mikasa Configuration Types
 */

export interface MikasaConfig {
  version: string;
  server: ServerConfig;
  llm: LLMConfig;
  agent: AgentConfig;
  database: DatabaseConfig;
  audio: AudioConfig;
}

export interface ServerConfig {
  port: number;
  host: string;
  autoStart: boolean;
  cors: {
    enabled: boolean;
    origins: string[];
  };
}

export interface LLMConfig {
  defaultProvider: 'claude' | 'opensource';
  providers: {
    claude?: ClaudeProviderConfig;
    opensource?: OpenSourceProviderConfig;
  };
}

export interface ClaudeProviderConfig {
  apiKey?: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

export interface OpenSourceProviderConfig {
  endpoint: string;
  model: string;
  apiKey?: string;
}

export interface AgentConfig {
  maxIterations: number;
  maxRetries: number;
  timeout: number;
  enabledTools: string[];
  safety: {
    allowShellCommands: boolean;
    allowGitPush: boolean;
    allowFileDelete: boolean;
  };
}

export interface DatabaseConfig {
  uri: string;
  name: string;
  options: {
    useNewUrlParser: boolean;
    useUnifiedTopology: boolean;
  };
}

export interface AudioConfig {
  format: 'wav' | 'mp3';
  sampleRate: number;
  channels: number;
  maxDuration: number;
  sttProvider: 'whisper' | 'claude-audio';
}
