/**
 * Background Job Queue
 */

import { generateJobId } from '../shared/utils/id-generator';
import { logger } from '../server/middleware/logger';

interface Job {
  id: string;
  type: string;
  data: any;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  error?: string;
  retries: number;
  maxRetries: number;
}

type JobHandler = (data: any) => Promise<void>;

class JobQueue {
  private queue: Job[] = [];
  private handlers: Map<string, JobHandler> = new Map();
  private processing = false;
  private processInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Start processing loop
    this.start();
  }

  /**
   * Register a job handler
   */
  registerHandler(type: string, handler: JobHandler): void {
    this.handlers.set(type, handler);
  }

  /**
   * Enqueue a new job
   */
  enqueue(type: string, data: any, maxRetries: number = 3): string {
    const job: Job = {
      id: generateJobId(),
      type,
      data,
      status: 'pending',
      createdAt: new Date(),
      retries: 0,
      maxRetries,
    };

    this.queue.push(job);
    logger.info(`Job enqueued: ${job.id} (type: ${type})`);

    // Trigger immediate processing
    this.processNext();

    return job.id;
  }

  /**
   * Get job status
   */
  getStatus(jobId: string): Job | undefined {
    return this.queue.find((j) => j.id === jobId);
  }

  /**
   * Start background processing
   */
  private start(): void {
    if (this.processInterval) {
      return;
    }

    // Process queue every 1 second
    this.processInterval = setInterval(() => {
      this.processNext();
    }, 1000);

    logger.info('Job queue started');
  }

  /**
   * Stop background processing
   */
  stop(): void {
    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = null;
      logger.info('Job queue stopped');
    }
  }

  /**
   * Process next pending job
   */
  private async processNext(): Promise<void> {
    if (this.processing) {
      return;
    }

    const job = this.queue.find((j) => j.status === 'pending');
    if (!job) {
      return;
    }

    this.processing = true;
    job.status = 'processing';

    try {
      const handler = this.handlers.get(job.type);
      if (!handler) {
        throw new Error(`No handler registered for job type: ${job.type}`);
      }

      await handler(job.data);

      job.status = 'completed';
      logger.info(`Job completed: ${job.id}`);

      // Remove completed jobs after some time
      setTimeout(() => {
        const index = this.queue.findIndex((j) => j.id === job.id);
        if (index !== -1) {
          this.queue.splice(index, 1);
        }
      }, 60000); // Keep for 1 minute
    } catch (error: any) {
      logger.error(`Job failed: ${job.id}`, error);

      job.error = error.message;
      job.retries++;

      if (job.retries < job.maxRetries) {
        // Retry
        job.status = 'pending';
        logger.info(`Job will be retried: ${job.id} (attempt ${job.retries + 1}/${job.maxRetries})`);
      } else {
        // Max retries reached
        job.status = 'failed';
        logger.error(`Job failed permanently: ${job.id}`);
      }
    } finally {
      this.processing = false;
    }

    // Process next job if available
    setImmediate(() => this.processNext());
  }

  /**
   * Get queue statistics
   */
  getStats(): {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  } {
    return {
      total: this.queue.length,
      pending: this.queue.filter((j) => j.status === 'pending').length,
      processing: this.queue.filter((j) => j.status === 'processing').length,
      completed: this.queue.filter((j) => j.status === 'completed').length,
      failed: this.queue.filter((j) => j.status === 'failed').length,
    };
  }
}

// Singleton instance
export const queue = new JobQueue();

// Convenience function
export function enqueueJob(type: string, data: any, maxRetries?: number): string {
  return queue.enqueue(type, data, maxRetries);
}

export function registerJobHandler(type: string, handler: JobHandler): void {
  queue.registerHandler(type, handler);
}
