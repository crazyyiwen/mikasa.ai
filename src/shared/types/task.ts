/**
 * Task Types
 */

export interface Task {
  taskId: string;
  sessionId: string;
  checkPointId: string;
  type: TaskType;
  status: TaskStatus;
  goal: string;
  plan?: TaskPlan;
  execution?: TaskExecution;
  createdAt: Date;
  updatedAt: Date;
}

export enum TaskType {
  CODEGEN = 'codegen',
  DEBUG = 'debug',
  REFACTOR = 'refactor',
  TEST = 'test',
}

export enum TaskStatus {
  PENDING = 'pending',
  PLANNING = 'planning',
  EXECUTING = 'executing',
  RETRYING = 'retrying',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface TaskPlan {
  steps: PlanStep[];
  reasoning: string;
  estimatedSteps: number;
}

export interface PlanStep {
  stepId: string;
  description: string;
  tool: string;
  params: Record<string, any>;
  dependencies: string[];
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
}

export interface TaskExecution {
  currentStep: number;
  completedSteps: string[];
  failedSteps: string[];
  logs: ExecutionLog[];
  filesModified: string[];
  commandsRun: CommandResult[];
  plan?: TaskPlan; // Optional: included when in preview mode
}

export interface ExecutionLog {
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  data?: any;
}

export interface CommandResult {
  command: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  duration: number;
}
