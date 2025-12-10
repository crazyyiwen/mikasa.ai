/**
 * Claude LLM Client Implementation
 */

import Anthropic from '@anthropic-ai/sdk';
import { BaseLLMClient } from '../../base-client';
import { CompletionRequest, CompletionResponse, CompletionChunk } from '../../types';
import { ClaudeProviderConfig } from '../../../shared/types/config';
import { LLMError } from '../../../shared/errors';

export class ClaudeClient extends BaseLLMClient {
  name = 'claude';
  private anthropic: Anthropic;

  constructor(config: ClaudeProviderConfig) {
    super(config);

    const apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new LLMError('Claude API key is required. Set ANTHROPIC_API_KEY or provide in config.');
    }

    this.anthropic = new Anthropic({
      apiKey,
    });
  }

  async generateCompletion(request: CompletionRequest): Promise<CompletionResponse> {
    try {
      const messages: Anthropic.MessageParam[] = [
        {
          role: 'user',
          content: this.buildPromptWithContext(request),
        },
      ];

      const response = await this.anthropic.messages.create({
        model: this.config.model || 'claude-sonnet-4-5-20250929',
        max_tokens: request.maxTokens || this.config.maxTokens || 4096,
        temperature: request.temperature ?? this.config.temperature ?? 0.7,
        system: request.systemPrompt,
        messages,
        tools: request.tools?.map((t) => ({
          name: t.name,
          description: t.description,
          input_schema: t.parameters,
        })),
      });

      return this.parseResponse(response);
    } catch (error: any) {
      throw new LLMError(`Claude API error: ${error.message}`);
    }
  }

  async streamCompletion(
    request: CompletionRequest,
    onChunk: (chunk: CompletionChunk) => void
  ): Promise<CompletionResponse> {
    try {
      const messages: Anthropic.MessageParam[] = [
        {
          role: 'user',
          content: this.buildPromptWithContext(request),
        },
      ];

      const stream = await this.anthropic.messages.create({
        model: this.config.model || 'claude-sonnet-4-5-20250929',
        max_tokens: request.maxTokens || this.config.maxTokens || 4096,
        temperature: request.temperature ?? this.config.temperature ?? 0.7,
        system: request.systemPrompt,
        messages,
        stream: true,
      });

      let fullText = '';
      let usage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

      for await (const event of stream) {
        if (event.type === 'content_block_delta') {
          const delta = (event as any).delta;
          if (delta.type === 'text_delta') {
            const text = delta.text || '';
            fullText += text;
            onChunk({ delta: text });
          }
        } else if (event.type === 'message_delta') {
          usage.completionTokens = (event as any).usage?.output_tokens || 0;
        } else if (event.type === 'message_start') {
          usage.promptTokens = (event as any).message?.usage?.input_tokens || 0;
        }
      }

      usage.totalTokens = usage.promptTokens + usage.completionTokens;

      return {
        text: fullText,
        usage,
        finishReason: 'stop',
      };
    } catch (error: any) {
      throw new LLMError(`Claude streaming error: ${error.message}`);
    }
  }

  private parseResponse(response: Anthropic.Message): CompletionResponse {
    const textContent = response.content
      .filter((c) => c.type === 'text')
      .map((c) => (c as any).text)
      .join('');

    const toolCalls = response.content
      .filter((c) => c.type === 'tool_use')
      .map((c) => ({
        id: (c as any).id,
        name: (c as any).name,
        arguments: (c as any).input,
      }));

    return {
      text: textContent,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      },
      finishReason: response.stop_reason === 'tool_use' ? 'tool_use' : 'stop',
    };
  }

  async transcribeAudio(_audioPath: string): Promise<string> {
    // Claude doesn't natively support audio transcription
    // This would need to be implemented with a separate service like Whisper
    throw new Error('Claude audio transcription not yet implemented. Use Whisper instead.');
  }
}
