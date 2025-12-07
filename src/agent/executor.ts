/**
 * Task Executor - Executes plan steps using tools
 */

import { BaseLLMClient } from '../llm/base-client';
import { BaseTool, ToolExecutionResult } from './tools/base-tool';
import { PlanStep } from '../shared/types/task';
import { AgentContext, addLog, addFileModified, addCommandRun } from './context';
import { AgentError } from '../shared/errors';

export class Executor {
  constructor(
    private llm: BaseLLMClient,
    private tools: BaseTool[]
  ) {}

  async executeStep(step: PlanStep, context: AgentContext): Promise<ToolExecutionResult> {
    addLog(context, 'info', `Executing: ${step.description}`, { step });

    const tool = this.findTool(step.tool);
    if (!tool) {
      const error = `Tool not found: ${step.tool}`;
      addLog(context, 'error', error);
      return {
        success: false,
        output: '',
        error,
      };
    }

    try {
      const result = await tool.execute(step.params);

      if (result.success) {
        addLog(context, 'info', `Step completed: ${step.description}`, { result });

        // Track side effects
        if (result.metadata?.filesModified) {
          result.metadata.filesModified.forEach((f: string) => addFileModified(context, f));
        }

        if (result.metadata?.command) {
          addCommandRun(context, {
            command: result.metadata.command,
            exitCode: result.metadata.exitCode || 0,
            stdout: result.metadata.stdout || '',
            stderr: result.metadata.stderr || '',
            duration: result.metadata.duration || 0,
          });
        }
      } else {
        addLog(context, 'error', `Step failed: ${step.description}`, { error: result.error });
      }

      return result;
    } catch (error: any) {
      const errorMessage = `Tool execution failed: ${error.message}`;
      addLog(context, 'error', errorMessage, { error });
      return {
        success: false,
        output: '',
        error: errorMessage,
      };
    }
  }

  private findTool(toolName: string): BaseTool | undefined {
    return this.tools.find((t) => t.name === toolName);
  }

  getAvailableTools(): BaseTool[] {
    return this.tools;
  }
}
