/**
 * Status Command - Check current task status
 */

import { Logger } from '../ui/logger';
import { Spinner } from '../ui/spinner';
import { MikasaAPIClient } from '../client/api-client';
import { SessionManager } from '../client/session';

export async function statusCommand(taskId?: string): Promise<void> {
  const sessionManager = new SessionManager();
  const apiClient = new MikasaAPIClient(sessionManager.getSessionId());
  const spinner = new Spinner();

  try {
    Logger.header('Task Status');

    if (!taskId) {
      Logger.warn('No task ID provided');
      Logger.info('Usage: mikasa status <taskId>');
      return;
    }

    spinner.start('Fetching task status...');

    const status = await apiClient.getTaskStatus(taskId);
    spinner.stop();

    Logger.section('Task Information');
    Logger.log(`Task ID: ${status.taskId}`);
    Logger.log(`Status: ${status.status}`);

    if (status.progress) {
      Logger.log(`Progress: ${status.progress.currentStep}/${status.progress.totalSteps}`);
      Logger.log(`Current Action: ${status.progress.currentAction}`);
    }

    if (status.result) {
      Logger.section('Result');
      Logger.log(JSON.stringify(status.result, null, 2));
    }

    if (status.error) {
      Logger.section('Error');
      Logger.error(status.error);
    }
  } catch (error: any) {
    spinner.fail('Error');
    Logger.error(error.message);
    process.exit(1);
  }
}
