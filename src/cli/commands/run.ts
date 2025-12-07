/**
 * Run Command - Execute code generation with text prompt
 */

import { Logger } from '../ui/logger';
import { Spinner } from '../ui/spinner';
import { Prompts } from '../ui/prompts';
import { MikasaAPIClient } from '../client/api-client';
import { SessionManager } from '../client/session';

export async function runCommand(prompt: string, options: any): Promise<void> {
  const sessionManager = new SessionManager();
  const apiClient = new MikasaAPIClient(sessionManager.getSessionId());
  const spinner = new Spinner();

  try {
    Logger.header('Mikasa Code Generation');

    // Check if server is running
    spinner.start('Connecting to Mikasa server...');
    const isHealthy = await apiClient.checkHealth();

    if (!isHealthy) {
      spinner.fail('Server is not running');
      Logger.error('Please start the Mikasa server first.');
      Logger.info('You can start it with: mikasa server start');
      process.exit(1);
    }

    spinner.succeed('Connected to server');

    // Display prompt
    Logger.section('Prompt');
    Logger.log(prompt);
    Logger.newLine();

    // Submit code generation request
    spinner.start('Processing your request...');

    const response = await apiClient.generateCode({
      prompt,
      sessionId: sessionManager.getSessionId(),
      userId: sessionManager.getUserId(),
      model: options.model,
      context: {
        workingDirectory: process.cwd(),
      },
      options: {
        autonomous: options.autonomous || false,
        maxIterations: 10,
      },
    });

    spinner.succeed(`Task created: ${response.taskId}`);

    // Poll for task completion
    spinner.start('Executing task...');
    let completed = false;
    let lastAction = '';

    while (!completed) {
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Poll every 2 seconds

      const status = await apiClient.getTaskStatus(response.taskId);

      if (status.progress && status.progress.currentAction !== lastAction) {
        lastAction = status.progress.currentAction;
        spinner.update(`${lastAction} (${status.progress.currentStep}/${status.progress.totalSteps})`);
      }

      if (status.status === 'completed') {
        completed = true;
        spinner.succeed('Task completed successfully!');

        if (status.result) {
          Logger.section('Results');
          if (status.result.filesModified && status.result.filesModified.length > 0) {
            Logger.info('Files modified:');
            status.result.filesModified.forEach((file: string) => {
              Logger.log(`  - ${file}`);
            });
          }
          if (status.result.summary) {
            Logger.newLine();
            Logger.log(status.result.summary);
          }

          // Ask user if they want to apply the changes
          Logger.newLine();
          const applyChanges = await Prompts.confirm('Apply these code changes?', true);

          if (applyChanges) {
            Logger.success('Changes applied!');

            // Ask if user wants to save the conversation
            const saveConversation = await Prompts.confirm('Save this conversation?', true);

            if (saveConversation) {
              spinner.start('Saving conversation...');
              await apiClient.saveConversation(response.taskId, response.checkPointId);
              spinner.succeed('Conversation saved!');
            }

            // Ask if user wants to create a PR
            const createPR = await Prompts.confirm('Create a Pull Request?', false);

            if (createPR) {
              spinner.start('Creating Pull Request...');
              const prResult = await apiClient.createPullRequest(response.taskId);
              spinner.succeed('Pull Request created!');
              Logger.success(`PR URL: ${prResult.prUrl}`);
            }
          } else {
            Logger.info('Changes not applied. You can review them manually.');
          }

          if (status.result.prUrl) {
            Logger.newLine();
            Logger.success(`Pull Request: ${status.result.prUrl}`);
          }
        }
      } else if (status.status === 'failed') {
        completed = true;
        spinner.fail('Task failed');
        Logger.error(status.error || 'Unknown error');
        process.exit(1);
      }
    }
  } catch (error: any) {
    spinner.fail('Error');
    Logger.error(error.message);
    process.exit(1);
  }
}
