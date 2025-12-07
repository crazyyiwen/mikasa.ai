/**
 * Transcribe Route - Speech to Text
 */

import { Router } from 'express';
import multer from 'multer';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { STTService } from '../services/stt-service';
import { logger } from '../middleware/logger';

const router = Router();

// Configure multer for file upload
const upload = multer({
  dest: path.join(os.tmpdir(), 'mikasa-uploads'),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

router.post('/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    const format = req.body.format || 'wav';
    const audioPath = req.file.path;

    logger.info(`Transcribing audio file: ${audioPath}`);

    const sttService = new STTService();
    const result = await sttService.transcribe(audioPath, format);

    // Clean up uploaded file
    try {
      fs.unlinkSync(audioPath);
    } catch (error) {
      logger.warn(`Failed to cleanup audio file: ${audioPath}`);
    }

    res.json(result);
  } catch (error: any) {
    logger.error('Transcription error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
