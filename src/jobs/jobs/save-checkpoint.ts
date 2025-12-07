/**
 * Save Checkpoint Job
 */

import { CheckpointRepository } from '../../db/repositories/checkpoint-repo';
import { Checkpoint } from '../../shared/types/checkpoint';
import { logger } from '../../server/middleware/logger';

const checkpointRepo = new CheckpointRepository();

export async function saveCheckpointJob(data: any): Promise<void> {
  try {
    const checkpoint: Checkpoint = {
      userId: data.userId,
      sessionId: data.sessionId,
      checkPointId: data.checkPointId,
      description: data.description,
      question: data.question,
      answer: data.answer,
      createdBy: data.userId,
      modifiedBy: data.userId,
      createTimeStamp: new Date(),
      metadata: data.metadata,
    };

    await checkpointRepo.create(checkpoint);

    logger.info(`Checkpoint saved: ${checkpoint.checkPointId}`);
  } catch (error: any) {
    logger.error('Failed to save checkpoint:', error);
    throw error;
  }
}
