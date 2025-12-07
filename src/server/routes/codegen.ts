/**
 * Code Generation Route
 */

import { Router } from 'express';
import { generateTaskId, generateCheckpointId } from '../../shared/utils/id-generator';
import { Agent } from '../../agent';
import { logger } from '../middleware/logger';

const router = Router();

// In-memory task storage (will be replaced with database in Phase 6)
const tasks = new Map<string, any>();

router.post('/codegen', async (req, res) => {
  try {
    const { prompt, sessionId, userId, model, context, options } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const taskId = generateTaskId();
    const checkPointId = generateCheckpointId();

    // Create task
    const task = {
      taskId,
      checkPointId,
      sessionId,
      userId,
      status: 'pending',
      prompt,
      model,
      context,
      options,
      createdAt: new Date(),
      progress: {
        currentStep: 0,
        totalSteps: 0,
        currentAction: 'Initializing...',
      },
    };

    tasks.set(taskId, task);

    // Return immediately - execution happens in background
    res.json({
      taskId,
      checkPointId,
      status: 'pending',
      message: 'Task created and execution started',
    });

    // Execute agent in background
    executeAgentInBackground(taskId, prompt, model, context?.workingDirectory, options);
  } catch (error: any) {
    logger.error('Code generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/tasks/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;

    const task = tasks.get(taskId);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({
      taskId: task.taskId,
      status: task.status,
      progress: task.progress,
      result: task.result,
      error: task.error,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Execute agent in background
 */
async function executeAgentInBackground(
  taskId: string,
  prompt: string,
  model?: string,
  workingDirectory?: string,
  options?: any
): Promise<void> {
  const task = tasks.get(taskId);
  if (!task) return;

  try {
    task.status = 'executing';
    task.progress.currentAction = 'Creating execution plan...';

    const agent = new Agent({
      taskId,
      model,
      workingDirectory: workingDirectory || process.cwd(),
      autonomous: options?.autonomous || false,
      maxIterations: options?.maxIterations || 10,
    });

    logger.info(`Executing task ${taskId}: ${prompt}`);

    const result = await agent.execute(prompt);

    // Update task with results
    task.status = 'completed';
    task.progress.currentStep = result.completedSteps.length;
    task.progress.totalSteps = result.completedSteps.length + result.failedSteps.length;
    task.progress.currentAction = 'Completed';
    task.result = {
      filesModified: result.filesModified,
      summary: `Task completed successfully. Modified ${result.filesModified.length} file(s).`,
      logs: result.logs,
    };

    logger.info(`Task ${taskId} completed successfully`);

    // Save checkpoint in background
    const { enqueueJob } = await import('../../jobs/queue');
    enqueueJob('save-checkpoint', {
      userId: task.userId,
      sessionId: task.sessionId,
      checkPointId: task.checkPointId,
      question: task.prompt,
      answer: result.logs.map(l => `[${l.level}] ${l.message}`).join('\n'),
      description: `Code generation: ${task.prompt.substring(0, 100)}`,
      metadata: {
        modelUsed: task.model || 'default',
        filesModified: result.filesModified,
        tokensUsed: 0,
        duration: Date.now() - task.createdAt.getTime(),
      },
    });
  } catch (error: any) {
    logger.error(`Task ${taskId} failed:`, error);

    task.status = 'failed';
    task.error = error.message;
    task.progress.currentAction = 'Failed';
  }
}

export default router;

// Export tasks map for use in other routes (temporary solution)
export { tasks };
