/**
 * Server Entry Point
 */

import { createApp } from './app';
import { loadConfig } from '../shared/utils/config-loader';
import { logger } from './middleware/logger';
import { connectDatabase, disconnectDatabase } from '../db';
import { initializeWorker, queue } from '../jobs/worker';

async function startServer(): Promise<void> {
  try {
    const config = loadConfig();

    // Connect to MongoDB
    try {
      await connectDatabase();
      logger.info('Database connected');
    } catch (error: any) {
      logger.warn(`Database connection failed: ${error.message}`);
      logger.warn('Running without database persistence');
    }

    // Initialize job worker
    initializeWorker();

    // Create Express app
    const app = createApp();

    const server = app.listen(config.server.port, config.server.host, () => {
      logger.info(`Mikasa server running on http://${config.server.host}:${config.server.port}`);
      logger.info('Press Ctrl+C to stop');
    });

    // Graceful shutdown
    const shutdown = async () => {
      logger.info('Shutting down gracefully...');

      // Close HTTP server
      server.close(async () => {
        logger.info('HTTP server closed');

        // Stop job queue
        queue.stop();

        // Disconnect from database
        try {
          await disconnectDatabase();
        } catch (error: any) {
          logger.error(`Error disconnecting from database: ${error.message}`);
        }

        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error: any) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
}

// Start server if this file is run directly
if (require.main === module) {
  startServer();
}

export { startServer };
