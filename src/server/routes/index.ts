/**
 * Routes Registry
 */

import { Router } from 'express';
import healthRouter from './health';
import transcribeRouter from './transcribe';
import codegenRouter from './codegen';
import modelsRouter from './models';
import checkpointsRouter from './checkpoints';
import gitRouter from './git';

const router = Router();

router.use(healthRouter);
router.use(transcribeRouter);
router.use(codegenRouter);
router.use(modelsRouter);
router.use(checkpointsRouter);
router.use(gitRouter);

export default router;
