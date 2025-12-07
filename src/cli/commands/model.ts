/**
 * Model Command - Manage LLM models
 */

import { Logger } from '../ui/logger';
import { Spinner } from '../ui/spinner';
import { MikasaAPIClient } from '../client/api-client';
import { SessionManager } from '../client/session';

export async function modelListCommand(): Promise<void> {
  const sessionManager = new SessionManager();
  const apiClient = new MikasaAPIClient(sessionManager.getSessionId());
  const spinner = new Spinner();

  try {
    Logger.header('Available Models');

    spinner.start('Fetching models...');
    const models = await apiClient.listModels();
    spinner.stop();

    Logger.section('Supported Models');
    models.forEach((model, index) => {
      Logger.log(`  ${index + 1}. ${model}`);
    });
    Logger.newLine();
  } catch (error: any) {
    spinner.fail('Error');
    Logger.error(error.message);
    process.exit(1);
  }
}

export async function modelSetCommand(modelName: string): Promise<void> {
  const sessionManager = new SessionManager();
  const apiClient = new MikasaAPIClient(sessionManager.getSessionId());
  const spinner = new Spinner();

  try {
    Logger.header('Set Default Model');

    spinner.start(`Setting default model to ${modelName}...`);
    await apiClient.setDefaultModel(modelName);
    spinner.succeed(`Default model set to: ${modelName}`);
  } catch (error: any) {
    spinner.fail('Error');
    Logger.error(error.message);
    process.exit(1);
  }
}
