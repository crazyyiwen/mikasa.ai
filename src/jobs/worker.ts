/**
 * Job Worker - Registers all job handlers
 */

import { registerJobHandler, queue } from './queue';
import { saveCheckpointJob } from './jobs/save-checkpoint';
import { logger } from '../server/middleware/logger';

/**
 * Initialize job worker by registering all handlers
 */
export function initializeWorker(): void {
  // Register job handlers
  registerJobHandler('save-checkpoint', saveCheckpointJob);

  logger.info('Job worker initialized');
}

export { queue };
