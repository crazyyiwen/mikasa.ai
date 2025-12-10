/**
 * Main Agent Orchestrator
 */

import { Planner } from './planner';
import { Executor } from './executor';
import { Iterator } from './iterator';
import { LLMFactory } from '../llm/providers/factory';
import { BaseLLMClient } from '../llm/base-client';
import { FileTool, CommandTool, GitTool, BaseTool } from './tools';
import { TaskExecution } from '../shared/types/task';
import { createContext, addLog } from './context';
import { loadConfig } from '../shared/utils/config-loader';
import { AgentError } from '../shared/errors';

export interface AgentConfig {
  taskId: string;
  model?: string;
  autonomous?: boolean;
  maxIterations?: number;
  workingDirectory?: string;
  previewMode?: boolean; // If true, generate plan without executing file writes
}

export class Agent {
  private llm: BaseLLMClient;
  private planner: Planner;
  private executor: Executor;
  private iterator: Iterator;
  private tools: BaseTool[];
  private config: AgentConfig;

  constructor(config: AgentConfig) {
    this.config = config;

    // Load agent configuration
    const appConfig = loadConfig();

    // Initialize LLM
    this.llm = LLMFactory.create(config.model);

    // Initialize tools
    this.tools = [
      new FileTool(config.workingDirectory),
      new CommandTool(config.workingDirectory, appConfig.agent.safety.allowShellCommands),
      new GitTool(config.workingDirectory, appConfig.agent.safety.allowGitPush),
    ];

    // Initialize agent components
    this.planner = new Planner(this.llm);
    this.executor = new Executor(this.tools);
    this.iterator = new Iterator(this.llm, appConfig.agent.maxRetries);
  }

  async execute(goal: string): Promise<TaskExecution> {
    const context = createContext(goal, this.config.workingDirectory);
    const appConfig = loadConfig();
    const maxIterations = this.config.maxIterations || appConfig.agent.maxIterations;

    addLog(context, 'info', 'Starting agent execution', { goal });

    try {
      // Phase 1: Planning
      addLog(context, 'info', 'Phase 1: Planning');
      const plan = await this.planner.createPlan(goal, context);

      // If in preview mode, return the plan without executing
      if (this.config.previewMode) {
        addLog(context, 'info', 'Preview mode: returning plan without execution');
        return {
          currentStep: 0,
          completedSteps: [],
          failedSteps: [],
          logs: context.logs,
          filesModified: [],
          commandsRun: [],
          plan, // Include the plan for preview
        };
      }

      // Phase 2: Execution
      addLog(context, 'info', 'Phase 2: Execution');

      const completedSteps: string[] = [];
      const failedSteps: string[] = [];

      for (let i = 0; i < plan.steps.length; i++) {
        const step = plan.steps[i];

        addLog(context, 'info', `Executing step ${i + 1}/${plan.steps.length}: ${step.description}`);

        step.status = 'in-progress';
        let result = await this.executor.executeStep(step, context);

        // Phase 3: Iteration (if step failed)
        if (!result.success && this.iterator.canRetry(step.stepId)) {
          addLog(context, 'warn', 'Step failed, attempting recovery');

          result = await this.iterator.retryWithFix(step, result, context, this.executor);
        }

        if (result.success) {
          step.status = 'completed';
          completedSteps.push(step.stepId);
          addLog(context, 'info', `Step completed: ${step.description}`);
        } else {
          step.status = 'failed';
          failedSteps.push(step.stepId);
          addLog(context, 'error', `Step failed after retries: ${step.description}`, {
            error: result.error,
          });

          if (!this.config.autonomous) {
            // In non-autonomous mode, stop on first failure
            throw new AgentError(`Step failed: ${result.error}`);
          }
        }

        // Safety: Prevent infinite loops
        if (i >= maxIterations) {
          throw new AgentError(`Maximum iterations (${maxIterations}) exceeded`);
        }
      }

      // Check if all steps completed
      if (failedSteps.length > 0 && !this.config.autonomous) {
        throw new AgentError(`${failedSteps.length} step(s) failed`);
      }

      addLog(context, 'info', 'Agent execution completed', {
        completedSteps: completedSteps.length,
        failedSteps: failedSteps.length,
      });

      return {
        currentStep: plan.steps.length,
        completedSteps,
        failedSteps,
        logs: context.logs,
        filesModified: context.filesModified,
        commandsRun: context.commandsRun,
      };
    } catch (error: any) {
      addLog(context, 'error', 'Agent execution failed', { error: error.message });
      throw error;
    }
  }
}
