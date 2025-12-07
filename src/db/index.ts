/**
 * Database Connection Manager
 */

import mongoose from 'mongoose';
import { loadConfig } from '../shared/utils/config-loader';
import { DatabaseError } from '../shared/errors';
import { logger } from '../server/middleware/logger';

let isConnected = false;

export async function connectDatabase(): Promise<void> {
  if (isConnected) {
    return;
  }

  try {
    const config = loadConfig();

    await mongoose.connect(config.database.uri, {
      dbName: config.database.name,
    });

    isConnected = true;
    logger.info(`Connected to MongoDB: ${config.database.name}`);

    // Handle connection events
    mongoose.connection.on('error', (error) => {
      logger.error('MongoDB connection error:', error);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
      isConnected = false;
    });
  } catch (error: any) {
    throw new DatabaseError(`Failed to connect to MongoDB: ${error.message}`);
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (!isConnected) {
    return;
  }

  try {
    await mongoose.disconnect();
    isConnected = false;
    logger.info('Disconnected from MongoDB');
  } catch (error: any) {
    throw new DatabaseError(`Failed to disconnect from MongoDB: ${error.message}`);
  }
}

export function getDatabaseConnection(): typeof mongoose {
  if (!isConnected) {
    throw new DatabaseError('Database is not connected');
  }
  return mongoose;
}
