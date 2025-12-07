/**
 * OpenSource LLM Client Implementation
 */

import axios, { AxiosInstance } from 'axios';
import { BaseLLMClient } from '../../base-client';
import { CompletionRequest, CompletionResponse, CompletionChunk } from '../../types';
import { OpenSourceProviderConfig } from '../../../shared/types/config';
import { LLMError } from '../../../shared/errors';

export class OpenSourceLLMClient extends BaseLLMClient {
  name = 'opensource';
  private client: AxiosInstance;

  constructor(config: OpenSourceProviderConfig) {
    super(config);

    this.client = axios.create({
      baseURL: config.endpoint,
      timeout: 120000, // 2 minutes
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey && { Authorization: `Bearer ${config.apiKey}` }),
      },
    });
  }

  async generateCompletion(request: CompletionRequest): Promise<CompletionResponse> {
    try {
      const prompt = this.buildFullPrompt(request);

      const response = await this.client.post('/completions', {
        model: this.config.model,
        prompt,
        max_tokens: request.maxTokens || 2048,
        temperature: request.temperature ?? 0.7,
        stop: ['<|endoftext|>', '<|end|>'],
      });

      const completion = response.data.choices[0].text;

      return {
        text: completion,
        usage: {
          promptTokens: response.data.usage?.prompt_tokens || 0,
          completionTokens: response.data.usage?.completion_tokens || 0,
          totalTokens: response.data.usage?.total_tokens || 0,
        },
        finishReason: 'stop',
      };
    } catch (error: any) {
      throw new LLMError(`OpenSource LLM error: ${error.message}`);
    }
  }

  async streamCompletion(
    request: CompletionRequest,
    onChunk: (chunk: CompletionChunk) => void
  ): Promise<CompletionResponse> {
    try {
      const prompt = this.buildFullPrompt(request);

      const response = await this.client.post(
        '/completions',
        {
          model: this.config.model,
          prompt,
          max_tokens: request.maxTokens || 2048,
          temperature: request.temperature ?? 0.7,
          stream: true,
        },
        {
          responseType: 'stream',
        }
      );

      let fullText = '';

      return new Promise((resolve, reject) => {
        response.data.on('data', (chunk: Buffer) => {
          const lines = chunk.toString().split('\n').filter(Boolean);
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.substring(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices[0].text || '';
                fullText += delta;
                onChunk({ delta });
              } catch {
                // Ignore parse errors
              }
            }
          }
        });

        response.data.on('end', () => {
          resolve({
            text: fullText,
            usage: {
              promptTokens: 0,
              completionTokens: 0,
              totalTokens: 0,
            },
            finishReason: 'stop',
          });
        });

        response.data.on('error', (error: Error) => {
          reject(new LLMError(`Streaming error: ${error.message}`));
        });
      });
    } catch (error: any) {
      throw new LLMError(`OpenSource LLM streaming error: ${error.message}`);
    }
  }

  private buildFullPrompt(request: CompletionRequest): string {
    let prompt = '';

    if (request.systemPrompt) {
      prompt += `System: ${request.systemPrompt}\n\n`;
    }

    if (request.context && request.context.length > 0) {
      prompt += 'Context:\n' + request.context.join('\n\n') + '\n\n';
    }

    prompt += `User: ${request.prompt}\n\nAssistant:`;

    return prompt;
  }
}
