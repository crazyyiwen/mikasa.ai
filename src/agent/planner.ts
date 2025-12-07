/**
 * Task Planner - Breaks down goals into executable steps
 */

import { BaseLLMClient } from '../llm/base-client';
import { TaskPlan, PlanStep } from '../shared/types/task';
import { AgentContext, addLog } from './context';
import { generateStepId } from '../shared/utils/id-generator';
import { AgentError } from '../shared/errors';

export class Planner {
  constructor(private llm: BaseLLMClient) {}

  async createPlan(goal: string, context: AgentContext): Promise<TaskPlan> {
    addLog(context, 'info', 'Creating execution plan');

    const systemPrompt = this.buildSystemPrompt();
    const prompt = this.buildPrompt(goal, context);

    try {
      const response = await this.llm.generateCompletion({
        systemPrompt,
        prompt,
        maxTokens: 2000,
        temperature: 0.3, // Lower temperature for more focused planning
      });

      const planData = this.parsePlanResponse(response.text);

      const plan: TaskPlan = {
        steps: planData.steps.map((s: any, i: number) => ({
          stepId: generateStepId(i),
          description: s.description,
          tool: s.tool,
          params: s.params,
          dependencies: s.dependencies || [],
          status: 'pending' as const,
        })),
        reasoning: planData.reasoning,
        estimatedSteps: planData.steps.length,
      };

      addLog(context, 'info', `Plan created with ${plan.steps.length} steps`, { plan });

      return plan;
    } catch (error: any) {
      addLog(context, 'error', 'Failed to create plan', { error: error.message });
      throw new AgentError(`Planning failed: ${error.message}`);
    }
  }

  private buildSystemPrompt(): string {
    return `You are an expert planning agent for software development tasks.
Your job is to break down high-level goals into concrete, executable steps.

Available tools:
1. file - Read, write, or patch files
   - Actions: read, write, patch
   - Use this to read existing code, create new files, or modify files

2. command - Execute shell commands
   - Use this to run npm/yarn commands, build tools, tests, etc.
   - Example commands: npm install, npm test, npm run build

3. git - Perform Git operations
   - Actions: status, commit, branch, push, pr
   - Use this to check status, commit changes, create branches, push code, create PRs

Response format:
Return ONLY a valid JSON object with this structure:
{
  "reasoning": "Brief explanation of the approach",
  "steps": [
    {
      "description": "What this step does",
      "tool": "file|command|git",
      "params": {
        // Tool-specific parameters
      },
      "dependencies": []
    }
  ]
}

Important guidelines:
- Start by reading relevant files to understand the codebase
- Make incremental changes
- Test after significant changes
- Commit changes with clear messages
- Each step should be atomic and focused`;
  }

  private buildPrompt(goal: string, context: AgentContext): string {
    return `Goal: ${goal}

Working directory: ${context.workingDirectory}

Create a detailed execution plan to achieve this goal.
Break it down into clear, executable steps using the available tools.`;
  }

  private parsePlanResponse(response: string): any {
    try {
      // Remove markdown code blocks if present
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
    } catch (error) {
      // If parsing fails, try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch {
          throw new Error('Failed to parse plan response');
        }
      }
      throw new Error('Failed to parse plan response');
    }
  }
}
