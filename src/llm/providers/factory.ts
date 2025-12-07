/**
 * LLM Client Factory
 */

import { BaseLLMClient } from '../base-client';
import { ClaudeClient } from './claude/client';
import { OpenSourceLLMClient } from './opensource/client';
import { loadConfig } from '../../shared/utils/config-loader';
import { LLMError } from '../../shared/errors';

export class LLMFactory {
  static create(provider?: string): BaseLLMClient {
    const config = loadConfig();
    const selectedProvider = provider || config.llm.defaultProvider;

    switch (selectedProvider) {
      case 'claude':
        if (!config.llm.providers.claude) {
          throw new LLMError('Claude provider is not configured');
        }
        return new ClaudeClient(config.llm.providers.claude);

      case 'opensource':
        if (!config.llm.providers.opensource) {
          throw new LLMError('OpenSource LLM provider is not configured');
        }
        return new OpenSourceLLMClient(config.llm.providers.opensource);

      default:
        throw new LLMError(`Unknown LLM provider: ${selectedProvider}`);
    }
  }

  static getSupportedProviders(): string[] {
    const config = loadConfig();
    const providers: string[] = [];

    if (config.llm.providers.claude) {
      providers.push('claude');
    }

    if (config.llm.providers.opensource) {
      providers.push('opensource');
    }

    return providers;
  }
}
