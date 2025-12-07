/**
 * ID Generation Utilities
 */

import { v4 as uuidv4 } from 'uuid';

export function generateSessionId(): string {
  return `session-${uuidv4()}`;
}

export function generateCheckpointId(): string {
  return `checkpoint-${uuidv4()}`;
}

export function generateTaskId(): string {
  return `task-${uuidv4()}`;
}

export function generateStepId(index: number): string {
  return `step-${index}-${uuidv4().substring(0, 8)}`;
}

export function generateJobId(): string {
  return `job-${uuidv4()}`;
}
