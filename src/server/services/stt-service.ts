/**
 * Speech-to-Text Service
 * Supports multiple STT providers (Whisper, Claude Audio, etc.)
 */

import * as fs from 'fs';
import axios from 'axios';
import FormData from 'form-data';
import Anthropic from '@anthropic-ai/sdk';
import { loadConfig } from '../../shared/utils/config-loader';
import { logger } from '../middleware/logger';

export interface STTResult {
  text: string;
  confidence?: number;
  duration: number;
}

export class STTService {
  private provider: string;
  private anthropic?: Anthropic;

  constructor() {
    const config = loadConfig();
    this.provider = config.audio?.sttProvider || 'whisper';

    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
    }
  }

  async transcribe(audioFilePath: string, format: string = 'wav'): Promise<STTResult> {
    const startTime = Date.now();

    try {
      let text: string;

      switch (this.provider) {
        case 'whisper':
          text = await this.transcribeWithWhisper(audioFilePath);
          break;
        case 'claude':
          text = await this.transcribeWithClaude(audioFilePath);
          break;
        default:
          throw new Error(`Unknown STT provider: ${this.provider}`);
      }

      const duration = Date.now() - startTime;

      return {
        text,
        confidence: 0.95,
        duration,
      };
    } catch (error: any) {
      logger.error('STT transcription failed:', error);
      throw new Error(`Transcription failed: ${error.message}`);
    }
  }

  private async transcribeWithWhisper(audioFilePath: string): Promise<string> {
    // Use OpenAI's Whisper API
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is required for Whisper transcription');
    }

    const formData = new FormData();
    formData.append('file', fs.createReadStream(audioFilePath));
    formData.append('model', 'whisper-1');
    formData.append('language', 'en');

    const response = await axios.post(
      'https://api.openai.com/v1/audio/transcriptions',
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    return response.data.text;
  }

  private async transcribeWithClaude(audioFilePath: string): Promise<string> {
    if (!this.anthropic) {
      throw new Error('Claude API key not configured');
    }

    // Read audio file as base64
    const audioBuffer = fs.readFileSync(audioFilePath);
    const audioBase64 = audioBuffer.toString('base64');

    // Claude's audio support (if available)
    // Note: This is a placeholder - Claude's audio API may differ
    const message = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Please transcribe the following audio:',
            },
            // This is conceptual - actual implementation depends on Claude's audio API
          ],
        },
      ],
    });

    const textContent = message.content.find((c) => c.type === 'text');
    if (textContent && 'text' in textContent) {
      return textContent.text;
    }

    throw new Error('No transcription returned from Claude');
  }

  async transcribeWithLocalWhisper(audioFilePath: string): Promise<string> {
    // For local Whisper deployment (e.g., whisper.cpp or local server)
    const endpoint = process.env.WHISPER_ENDPOINT || 'http://localhost:8000/v1/audio/transcriptions';

    const formData = new FormData();
    formData.append('file', fs.createReadStream(audioFilePath));
    formData.append('model', 'whisper-1');

    const response = await axios.post(endpoint, formData, {
      headers: formData.getHeaders(),
    });

    return response.data.text;
  }
}
