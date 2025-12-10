/**
 * Checkpoints Route - Save and retrieve conversation checkpoints
 */

import { Router } from 'express';
import { enqueueJob } from '../../jobs/queue';
import { logger } from '../middleware/logger';
import { tasks } from './codegen';

const router = Router();

router.post('/checkpoints/save', async (req, res) => {
  try {
    const { taskId, checkPointId, sessionId } = req.body;

    if (!taskId || !checkPointId || !sessionId) {
      return res.status(400).json({
        error: 'taskId, checkPointId, and sessionId are required',
      });
    }

    // Get task from memory (in production, this would come from database)
    const task = tasks.get(taskId);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    logger.info(`Saving checkpoint ${checkPointId} for task ${taskId}`);

    // Enqueue background job to save checkpoint
    enqueueJob('save-checkpoint', {
      userId: task.userId,
      sessionId: task.sessionId,
      checkPointId: task.checkPointId,
      question: task.prompt,
      answer: task.result?.summary || 'Task completed',
      description: `Code generation: ${task.prompt.substring(0, 100)}`,
      metadata: {
        modelUsed: task.model || 'default',
        filesModified: task.result?.filesModified || [],
        tokensUsed: 0,
        duration: Date.now() - task.createdAt.getTime(),
      },
    });

    return res.json({
      success: true,
      message: 'Checkpoint save queued',
      checkPointId,
    });
  } catch (error: any) {
    logger.error('Error saving checkpoint:', error);
    return res.status(500).json({ error: error.message });
  }
});

router.get('/checkpoints', async (req, res) => {
  try {
    const { sessionId, userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const { CheckpointRepository } = await import('../../db/repositories/checkpoint-repo');
    const repo = new CheckpointRepository();

    let checkpoints;

    if (sessionId) {
      checkpoints = await repo.findBySession(sessionId as string);
    } else {
      checkpoints = await repo.findByUser(userId as string);
    }

    return res.json({
      checkpoints,
      total: checkpoints.length,
    });
  } catch (error: any) {
    logger.error('Error retrieving checkpoints:', error);
    return res.status(500).json({ error: error.message });
  }
});

router.get('/checkpoints/search', async (req, res) => {
  try {
    const { query, userId, sessionId, limit, minScore } = req.query;

    if (!query || !userId) {
      return res.status(400).json({
        error: 'query and userId are required',
      });
    }

    const { CheckpointRepository } = await import('../../db/repositories/checkpoint-repo');
    const repo = new CheckpointRepository();

    const results = await repo.semanticSearch(query as string, userId as string, {
      limit: limit ? parseInt(limit as string) : 10,
      sessionId: sessionId as string,
      minScore: minScore ? parseFloat(minScore as string) : 0.7,
    });

    return res.json({
      results: results.map((r) => ({
        checkpoint: r.checkpoint,
        similarity: r.score,
      })),
      total: results.length,
    });
  } catch (error: any) {
    logger.error('Error searching checkpoints:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
