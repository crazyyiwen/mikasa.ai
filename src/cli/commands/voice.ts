/**
 * Voice Command - Voice input mode
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Logger } from '../ui/logger';
import { Spinner } from '../ui/spinner';
import { Prompts } from '../ui/prompts';
import { MikasaAPIClient } from '../client/api-client';
import { SessionManager } from '../client/session';
import { runCommand } from './run';

const recorder = require('node-record-lpcm16');

export async function voiceCommand(options: any): Promise<void> {
  const sessionManager = new SessionManager();
  const apiClient = new MikasaAPIClient(sessionManager.getSessionId());
  const spinner = new Spinner();

  try {
    Logger.header('Voice Input Mode');
    Logger.info('Press Ctrl+C to stop recording');
    Logger.newLine();

    // Record audio
    const audioPath = await recordAudio(spinner);

    if (!audioPath) {
      Logger.warn('Recording cancelled');
      return;
    }

    // Transcribe audio
    spinner.start('Transcribing audio...');
    const transcription = await apiClient.transcribeAudio(audioPath);
    spinner.succeed('Audio transcribed');

    // Clean up audio file
    try {
      fs.unlinkSync(audioPath);
    } catch (error) {
      // Ignore cleanup errors
    }

    if (!transcription) {
      Logger.warn('No transcription received');
      return;
    }

    Logger.info(`Transcription: ${transcription}`);
    Logger.newLine();

    // Confirm with user
    const proceed = await Prompts.confirm('Proceed with this prompt?', true);
    if (!proceed) {
      Logger.info('Cancelled');
      return;
    }

    // Use the run command logic
    await runCommand(transcription, options);
  } catch (error: any) {
    spinner.fail('Error');
    Logger.error(error.message);
    process.exit(1);
  }
}

async function recordAudio(spinner: Spinner): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const tempDir = os.tmpdir();
    const audioPath = path.join(tempDir, `mikasa-${Date.now()}.wav`);
    const file = fs.createWriteStream(audioPath, { encoding: 'binary' });

    spinner.start('Recording... (Press Ctrl+C to stop)');

    const recording = recorder.record({
      sampleRate: 16000,
      channels: 1,
      audioType: 'wav',
      recorder: process.platform === 'win32' ? 'sox' : 'rec',
      silence: '5.0',
    });

    recording.stream().pipe(file);

    const stopRecording = () => {
      recording.stop();
      spinner.succeed('Recording stopped');
      resolve(audioPath);
    };

    // Stop on Ctrl+C
    process.on('SIGINT', stopRecording);

    recording.stream().on('error', (err: Error) => {
      spinner.fail('Recording error');
      reject(err);
    });

    file.on('error', (err: Error) => {
      spinner.fail('File write error');
      reject(err);
    });
  });
}
