/**
 * Express Application Setup
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import routes from './routes';
import { errorHandler } from './middleware/error-handler';
import { requestLogger } from './middleware/logger';
import { loadConfig } from '../shared/utils/config-loader';

export function createApp(): express.Application {
  const app = express();
  const config = loadConfig();

  // Security
  app.use(helmet());

  // CORS
  if (config.server.cors.enabled) {
    app.use(cors({
      origin: config.server.cors.origins,
      credentials: true,
    }));
  }

  // Performance
  app.use(compression());

  // Parsing
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Logging
  app.use(requestLogger);

  // Routes
  app.use('/api', routes);

  // Error handling
  app.use(errorHandler);

  return app;
}
