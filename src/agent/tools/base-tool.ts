/**
 * Base Tool Abstract Class
 */

import { ToolDefinition } from '../../llm/types';

export interface ToolParameterSchema {
  type: 'object';
  properties: Record<string, any>;
  required: string[];
}

export interface ToolExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  metadata?: Record<string, any>;
}

export abstract class BaseTool {
  abstract name: string;
  abstract description: string;
  abstract parameters: ToolParameterSchema;

  abstract execute(params: Record<string, any>): Promise<ToolExecutionResult>;

  toDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: this.description,
      parameters: this.parameters,
    };
  }
}
