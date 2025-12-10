/**
 * API Client for Backend Communication
 */

import axios, { AxiosInstance } from 'axios';
import FormData from 'form-data';
import * as fs from 'fs';
import { loadConfig } from '../../shared/utils/config-loader';

export interface TranscribeResponse {
  text: string;
  confidence?: number;
  duration: number;
}

export interface CodeGenRequest {
  prompt: string;
  sessionId: string;
  userId: string;
  model?: string;
  context?: {
    workingDirectory: string;
    files?: string[];
  };
  options?: {
    autonomous: boolean;
    maxIterations: number;
  };
}

export interface CodeGenResponse {
  taskId: string;
  checkPointId: string;
  status: string;
  result?: {
    filesModified: string[];
    summary: string;
    prUrl?: string;
  };
  error?: string;
}

export interface TaskStatusResponse {
  taskId: string;
  status: string;
  progress?: {
    currentStep: number;
    totalSteps: number;
    currentAction: string;
  };
  result?: any;
  error?: string;
}

export class MikasaAPIClient {
  private client: AxiosInstance;
  private sessionId: string;

  constructor(sessionId: string) {
    const config = loadConfig();
    this.sessionId = sessionId;

    this.client = axios.create({
      baseURL: `http://${config.server.host}:${config.server.port}`,
      timeout: 300000, // 5 minutes
      headers: {
        'X-Session-ID': sessionId,
      },
    });
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await this.client.get('/api/health');
      return response.data.status === 'ok';
    } catch {
      return false;
    }
  }

  async transcribe(audioFilePath: string, format: string): Promise<TranscribeResponse> {
    const formData = new FormData();
    formData.append('audio', fs.createReadStream(audioFilePath));
    formData.append('format', format);

    const response = await this.client.post('/api/transcribe', formData, {
      headers: formData.getHeaders(),
    });

    return response.data;
  }

  async generateCode(request: CodeGenRequest): Promise<CodeGenResponse> {
    const response = await this.client.post('/api/codegen', request);
    return response.data;
  }

  async getTaskStatus(taskId: string): Promise<TaskStatusResponse> {
    const response = await this.client.get(`/api/tasks/${taskId}`);
    return response.data;
  }

  async listModels(): Promise<string[]> {
    const response = await this.client.get('/api/models');
    return response.data.models;
  }

  async setDefaultModel(model: string): Promise<void> {
    await this.client.post('/api/models/default', { model });
  }

  async transcribeAudio(audioFilePath: string): Promise<string> {
    const response = await this.transcribe(audioFilePath, 'wav');
    return response.text;
  }

  async saveConversation(taskId: string, checkPointId: string): Promise<void> {
    await this.client.post('/api/checkpoints/save', {
      taskId,
      checkPointId,
      sessionId: this.sessionId,
    });
  }

  async createPullRequest(taskId: string): Promise<{ prUrl: string }> {
    const response = await this.client.post('/api/git/create-pr', {
      taskId,
      sessionId: this.sessionId,
    });
    return response.data;
  }

  async applyChanges(taskId: string): Promise<void> {
    await this.client.post(`/api/tasks/${taskId}/apply`);
  }
}
