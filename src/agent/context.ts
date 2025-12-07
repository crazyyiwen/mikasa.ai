/**
 * Agent Context - Maintains state during task execution
 */

import { ExecutionLog, CommandResult } from '../shared/types/task';

export interface AgentContext {
  goal: string;
  workingDirectory: string;
  filesModified: string[];
  commandsRun: CommandResult[];
  logs: ExecutionLog[];
  metadata: Record<string, any>;
}

export function createContext(goal: string, workingDirectory?: string): AgentContext {
  return {
    goal,
    workingDirectory: workingDirectory || process.cwd(),
    filesModified: [],
    commandsRun: [],
    logs: [],
    metadata: {},
  };
}

export function addLog(
  context: AgentContext,
  level: 'info' | 'warn' | 'error' | 'debug',
  message: string,
  data?: any
): void {
  context.logs.push({
    timestamp: new Date(),
    level,
    message,
    data,
  });
}

export function addFileModified(context: AgentContext, filePath: string): void {
  if (!context.filesModified.includes(filePath)) {
    context.filesModified.push(filePath);
  }
}

export function addCommandRun(context: AgentContext, result: CommandResult): void {
  context.commandsRun.push(result);
}
