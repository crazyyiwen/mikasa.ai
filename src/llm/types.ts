/**
 * LLM Types and Interfaces
 */

export interface LLMClient {
  name: string;

  generateCompletion(request: CompletionRequest): Promise<CompletionResponse>;

  streamCompletion(
    request: CompletionRequest,
    onChunk: (chunk: CompletionChunk) => void
  ): Promise<CompletionResponse>;

  transcribeAudio?(audioPath: string): Promise<string>;
}

export interface CompletionRequest {
  prompt: string;
  systemPrompt?: string;
  context?: string[];
  tools?: ToolDefinition[];
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

export interface CompletionResponse {
  text: string;
  toolCalls?: ToolCall[];
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: 'stop' | 'length' | 'tool_use' | 'error';
}

export interface CompletionChunk {
  delta: string;
  toolCall?: Partial<ToolCall>;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
  };
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

export interface ToolResult {
  toolCallId: string;
  output: string;
  error?: string;
}
