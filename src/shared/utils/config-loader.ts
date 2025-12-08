/**
 * Configuration Loader
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { MikasaConfig } from '../types/config';
import { DEFAULT_CONFIG_PATH, DEFAULT_PORT, DEFAULT_HOST } from '../constants';
import { ConfigurationError } from '../errors';

// Load environment variables
dotenv.config();

let cachedConfig: MikasaConfig | null = null;

export function loadConfig(configPath?: string): MikasaConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const defaultConfig: MikasaConfig = {
    version: '1.0.0',
    server: {
      port: parseInt(process.env.SERVER_PORT || '') || DEFAULT_PORT,
      host: process.env.SERVER_HOST || DEFAULT_HOST,
      autoStart: true,
      cors: {
        enabled: true,
        origins: ['http://localhost:3000'],
      },
    },
    llm: {
      defaultProvider: 'claude',
      providers: {
        claude: {
          apiKey: process.env.ANTHROPIC_API_KEY,
          model: 'claude-sonnet-4-5-20250929',
          maxTokens: 4096,
          temperature: 0.7,
        },
        opensource: {
          endpoint: process.env.OPENSOURCE_LLM_ENDPOINT || 'http://localhost:8000/v1/completions',
          model: process.env.OPENSOURCE_LLM_MODEL || 'codellama-34b',
          apiKey: process.env.OPENSOURCE_LLM_API_KEY,
        },
      },
    },
    agent: {
      maxIterations: 10,
      maxRetries: 3,
      timeout: 300000,
      enabledTools: ['file', 'command', 'git'],
      safety: {
        allowShellCommands: true,
        allowGitPush: true,
        allowFileDelete: false,
      },
    },
    database: {
      uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
      name: process.env.MONGODB_DB_NAME || 'mikasa_cli',
      options: {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      },
    },
    audio: {
      format: 'wav',
      sampleRate: 16000,
      channels: 1,
      maxDuration: 120,
      sttProvider: 'whisper',
    },
  };

  // Try to load config file if it exists
  const resolvedConfigPath = configPath || path.resolve(process.cwd(), DEFAULT_CONFIG_PATH);

  if (fs.existsSync(resolvedConfigPath)) {
    try {
      const configFile = fs.readFileSync(resolvedConfigPath, 'utf-8');
      const userConfig = JSON.parse(configFile);
      cachedConfig = mergeConfig(defaultConfig, userConfig);
    } catch (error) {
      throw new ConfigurationError(`Failed to load config from ${resolvedConfigPath}: ${error}`);
    }
  } else {
    cachedConfig = defaultConfig;
  }

  return cachedConfig;
}

function mergeConfig(defaultConfig: MikasaConfig, userConfig: Partial<MikasaConfig>): MikasaConfig {
  return {
    ...defaultConfig,
    ...userConfig,
    server: { ...defaultConfig.server, ...userConfig.server },
    llm: {
      ...defaultConfig.llm,
      ...userConfig.llm,
      providers: {
        ...defaultConfig.llm.providers,
        ...userConfig.llm?.providers,
      },
    },
    agent: { ...defaultConfig.agent, ...userConfig.agent },
    database: { ...defaultConfig.database, ...userConfig.database },
    audio: { ...defaultConfig.audio, ...userConfig.audio },
  };
}

export function saveConfig(config: MikasaConfig, configPath?: string): void {
  const resolvedConfigPath = configPath || path.resolve(process.cwd(), DEFAULT_CONFIG_PATH);
  try {
    fs.writeFileSync(resolvedConfigPath, JSON.stringify(config, null, 2), 'utf-8');
  } catch (error) {
    throw new ConfigurationError(`Failed to save config to ${resolvedConfigPath}: ${error}`);
  }
}

export function resetConfigCache(): void {
  cachedConfig = null;
}
