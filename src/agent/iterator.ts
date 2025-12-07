/**
 * Task Iterator - Handles error recovery and retries
 */

import { BaseLLMClient } from '../llm/base-client';
import { ToolExecutionResult } from './tools/base-tool';
import { PlanStep } from '../shared/types/task';
import { AgentContext, addLog } from './context';
import { Executor } from './executor';

export class Iterator {
  private retryCount: Map<string, number> = new Map();

  constructor(
    private llm: BaseLLMClient,
    private maxRetries: number = 3
  ) {}

  canRetry(stepId: string): boolean {
    const count = this.retryCount.get(stepId) || 0;
    return count < this.maxRetries;
  }

  async retryWithFix(
    step: PlanStep,
    failedResult: ToolExecutionResult,
    context: AgentContext,
    executor: Executor
  ): Promise<ToolExecutionResult> {
    const retryCount = (this.retryCount.get(step.stepId) || 0) + 1;
    this.retryCount.set(step.stepId, retryCount);

    addLog(context, 'info', `Attempting to fix failed step (attempt ${retryCount}/${this.maxRetries})`);

    try {
      // Ask LLM how to fix the error
      const fixStrategy = await this.getFix Strategy(step, failedResult, context);

      if (!fixStrategy) {
        return failedResult;
      }

      addLog(context, 'info', `Fix strategy: ${fixStrategy.reasoning}`);

      // Apply the fix by executing the modified step
      const modifiedStep: PlanStep = {
        ...step,
        params: fixStrategy.modifiedParams || step.params,
        description: `${step.description} (retry with fix)`,
      };

      const result = await executor.executeStep(modifiedStep, context);

      return result;
    } catch (error: any) {
      addLog(context, 'error', `Fix attempt failed: ${error.message}`);
      return failedResult;
    }
  }

  private async getFixStrategy(
    step: PlanStep,
    failedResult: ToolExecutionResult,
    context: AgentContext
  ): Promise<{ reasoning: string; modifiedParams?: any } | null> {
    const systemPrompt = `You are an expert debugging agent.
A step in a software development task has failed.
Analyze the error and suggest how to fix it.

Return ONLY a valid JSON object:
{
  "reasoning": "Why it failed and how to fix it",
  "modifiedParams": {
    // Modified parameters for the tool, or null if unfixable
  }
}

If the error is not fixable, return modifiedParams as null.`;

    const prompt = `Failed step:
Description: ${step.description}
Tool: ${step.tool}
Parameters: ${JSON.stringify(step.params, null, 2)}

Error: ${failedResult.error}
Output: ${failedResult.output}

How should this be fixed?`;

    try {
      const response = await this.llm.generateCompletion({
        systemPrompt,
        prompt,
        maxTokens: 1000,
        temperature: 0.3,
      });

      const fix = this.parseFixResponse(response.text);

      if (!fix || fix.modifiedParams === null) {
        return null;
      }

      return fix;
    } catch (error: any) {
      addLog(context, 'error', `Failed to get fix strategy: ${error.message}`);
      return null;
    }
  }

  private parseFixResponse(response: string): any {
    try {
      let cleanResponse = response.trim();
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.substring(7);
      }
      if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.substring(3);
      }
      if (cleanResponse.endsWith('```')) {
        cleanResponse = cleanResponse.substring(0, cleanResponse.length - 3);
      }

      return JSON.parse(cleanResponse.trim());
    } catch {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch {
          return null;
        }
      }
      return null;
    }
  }

  resetRetryCount(stepId: string): void {
    this.retryCount.delete(stepId);
  }
}
