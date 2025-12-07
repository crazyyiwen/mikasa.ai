/**
 * Base LLM Client Abstract Class
 */

import {
  LLMClient,
  CompletionRequest,
  CompletionResponse,
  CompletionChunk,
  ToolResult,
} from './types';

export abstract class BaseLLMClient implements LLMClient {
  abstract name: string;
  protected config: any;

  constructor(config: any) {
    this.config = config;
  }

  abstract generateCompletion(request: CompletionRequest): Promise<CompletionResponse>;

  abstract streamCompletion(
    request: CompletionRequest,
    onChunk: (chunk: CompletionChunk) => void
  ): Promise<CompletionResponse>;

  async transcribeAudio?(audioPath: string): Promise<string> {
    throw new Error('Audio transcription not supported by this provider');
  }

  /**
   * Helper method for tool execution loop
   */
  protected formatToolResults(results: ToolResult[]): string {
    return results
      .map((r) => `Tool: ${r.toolCallId}\nResult: ${r.output}\nError: ${r.error || 'none'}`)
      .join('\n\n');
  }

  /**
   * Helper to construct messages with context
   */
  protected buildPromptWithContext(request: CompletionRequest): string {
    let fullPrompt = '';

    if (request.context && request.context.length > 0) {
      fullPrompt += '=== Context ===\n';
      fullPrompt += request.context.join('\n\n');
      fullPrompt += '\n\n=== Request ===\n';
    }

    fullPrompt += request.prompt;

    return fullPrompt;
  }
}
