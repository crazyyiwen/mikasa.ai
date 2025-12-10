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

    // Execute agent in background (don't await)
    executeAgentInBackground(taskId, prompt, model, context?.workingDirectory, options);

    // Return immediately - execution happens in background
    return res.json({
      taskId,
      checkPointId,
      status: 'pending',
      message: 'Task created and execution started',
    });
  } catch (error: any) {
    logger.error('Code generation error:', error);
    return res.status(500).json({ error: error.message });
  }
});

router.get('/tasks/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;

    const task = tasks.get(taskId);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    return res.json({
      taskId: task.taskId,
      status: task.status,
      progress: task.progress,
      result: task.result,
      error: task.error,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Apply changes endpoint - executes the plan after user approval
router.post('/tasks/:taskId/apply', async (req, res) => {
  try {
    const { taskId } = req.params;

    const task = tasks.get(taskId);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (!task.result?.plan) {
      return res.status(400).json({ error: 'No plan available to apply' });
    }

    if (task.status !== 'completed') {
      return res.status(400).json({ error: 'Task is not ready to apply' });
    }

    // Execute the plan (without preview mode) - wrap in try-catch to prevent crashes
    executeApprovedPlan(taskId, task.prompt, task.model, task.context?.workingDirectory, task.options)
      .catch((error) => {
        logger.error(`Failed to execute approved plan for task ${taskId}:`, error);
        task.status = 'failed';
        task.error = error.message;
        task.progress.currentAction = 'Failed to apply changes';
      });

    return res.json({
      message: 'Applying changes...',
      taskId,
    });
  } catch (error: any) {
    logger.error('Apply changes error:', error);
    return res.status(500).json({ error: error.message });
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

    // Run in preview mode first (don't apply changes yet)
    const agent = new Agent({
      taskId,
      model,
      workingDirectory: workingDirectory || process.cwd(),
      autonomous: options?.autonomous || false,
      maxIterations: options?.maxIterations || 10,
      previewMode: options?.previewMode !== false, // Preview mode by default
    });

    logger.info(`Executing task ${taskId}: ${prompt} (preview: ${agent['config'].previewMode})`);

    const result = await agent.execute(prompt);

    // Update task with results
    task.status = 'completed';
    task.progress.currentStep = result.completedSteps.length;
    task.progress.totalSteps = result.plan?.steps.length || result.completedSteps.length + result.failedSteps.length;
    task.progress.currentAction = result.plan ? 'Waiting for approval' : 'Completed';
    task.result = {
      filesModified: result.filesModified,
      summary: result.plan
        ? `Plan created with ${result.plan.steps.length} step(s). Waiting for approval.`
        : `Task completed successfully. Modified ${result.filesModified.length} file(s).`,
      logs: result.logs,
      plan: result.plan, // Include plan for preview
    };

    logger.info(`Task ${taskId} ${result.plan ? 'plan created' : 'completed successfully'}`);

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

/**
 * Execute approved plan (apply changes after user approval)
 */
async function executeApprovedPlan(
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
    task.progress.currentAction = 'Applying changes...';

    // Run agent with preview mode OFF to actually apply changes
    const agent = new Agent({
      taskId,
      model,
      workingDirectory: workingDirectory || process.cwd(),
      autonomous: options?.autonomous || false,
      maxIterations: options?.maxIterations || 10,
      previewMode: false, // Actually execute the changes
    });

    logger.info(`Applying changes for task ${taskId}: ${prompt}`);

    const result = await agent.execute(prompt);

    // Update task with results
    task.status = 'completed';
    task.progress.currentStep = result.completedSteps.length;
    task.progress.totalSteps = result.completedSteps.length + result.failedSteps.length;
    task.progress.currentAction = 'Changes applied';
    task.result = {
      filesModified: result.filesModified,
      summary: `Changes applied successfully. Modified ${result.filesModified.length} file(s).`,
      logs: result.logs,
      plan: task.result.plan, // Keep the original plan for reference
    };

    logger.info(`Task ${taskId} changes applied successfully`);
  } catch (error: any) {
    logger.error(`Task ${taskId} apply failed:`, error);

    task.status = 'failed';
    task.error = error.message;
    task.progress.currentAction = 'Failed to apply changes';
  }
}

export default router;

// Export tasks map for use in other routes (temporary solution)
export { tasks };
