/**
 * Interactive REPL Command
 * Provides a continuous conversation interface like Claude Code CLI
 */

import * as readline from 'readline';
import { Logger } from '../ui/logger';
import { Spinner } from '../ui/spinner';
import { Prompts } from '../ui/prompts';
import { MikasaAPIClient } from '../client/api-client';
import { SessionManager } from '../client/session';

export async function interactiveCommand(initialPrompt?: string, options: any = {}): Promise<void> {
  const sessionManager = new SessionManager();
  const apiClient = new MikasaAPIClient(sessionManager.getSessionId());
  const spinner = new Spinner();

  try {
    // Check if server is running FIRST
    spinner.start('Connecting to Mikasa server...');
    const isHealthy = await apiClient.checkHealth();

    if (!isHealthy) {
      spinner.fail('Server is not running');
      Logger.error('Please start the Mikasa server first.');
      Logger.info('You can start it with: mikasa server start');
      process.exit(1);
    }

    spinner.succeed('Connected to server');
    Logger.newLine();

    // Display welcome header AFTER connection succeeds
    Logger.header('Mikasa Interactive Mode');
    Logger.info(`Session ID: ${sessionManager.getSessionId()}`);
    Logger.info('Type "exit" or press Ctrl+D to quit');
    Logger.newLine();

    // If initial prompt is provided, process it first
    if (initialPrompt) {
      await processPrompt(initialPrompt, options, apiClient, sessionManager, spinner);
      Logger.newLine();
    }

    // Start REPL loop - use a promise to keep it running
    await new Promise<void>((resolve) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: '> ',
      });

      rl.prompt();

      rl.on('line', async (line: string) => {
        const input = line.trim();

        // Handle exit commands
        if (input === 'exit' || input === 'quit') {
          Logger.info('Goodbye!');
          rl.close();
          resolve();
          return;
        }

        // Handle empty input
        if (!input) {
          rl.prompt();
          return;
        }

        // Handle slash commands
        if (input.startsWith('/')) {
          await handleSlashCommand(input);
          rl.prompt();
          return;
        }

        // Process regular prompt
        try {
          // Pause readline while processing to avoid conflicts
          rl.pause();
          await processPrompt(input, options, apiClient, sessionManager, spinner);
          rl.resume();
        } catch (error: any) {
          Logger.error(error.message);
          rl.resume();
        }

        rl.prompt();
      });

      rl.on('close', () => {
        Logger.info('\nGoodbye!');
        resolve();
      });

      // Handle Ctrl+C gracefully
      rl.on('SIGINT', () => {
        Logger.info('\n(To exit, type "exit" or press Ctrl+D)');
        rl.prompt();
      });
    });
  } catch (error: any) {
    spinner.fail('Error');
    Logger.error(error.message);
    process.exit(1);
  }
}

async function processPrompt(
  prompt: string,
  options: any,
  apiClient: MikasaAPIClient,
  sessionManager: SessionManager,
  spinner: Spinner
): Promise<void> {
  try {
    Logger.newLine();
    Logger.section('Processing');
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

          // If there's a plan, display it (preview mode)
          if (status.result.plan) {
            Logger.info('Proposed changes:');
            Logger.newLine();

            status.result.plan.steps.forEach((step: any, index: number) => {
              Logger.log(`${index + 1}. ${step.description}`);
              if (step.tool === 'file' && step.params) {
                if (step.params.action === 'write') {
                  Logger.log(`   → Create/Update: ${step.params.path}`);
                  if (step.params.content) {
                    const preview = step.params.content.substring(0, 100);
                    Logger.log(`   Content preview: ${preview}${step.params.content.length > 100 ? '...' : ''}`);
                  }
                } else if (step.params.action === 'patch') {
                  Logger.log(`   → Modify: ${step.params.path}`);
                } else if (step.params.action === 'read') {
                  Logger.log(`   → Read: ${step.params.path}`);
                }
              }
            });

            Logger.newLine();
            if (status.result.plan.reasoning) {
              Logger.log(`Reasoning: ${status.result.plan.reasoning}`);
              Logger.newLine();
            }

            // Ask user to approve the changes
            const applyChanges = await Prompts.confirm('Apply these code changes?', true);

            if (applyChanges) {
              spinner.start('Applying changes...');

              // Call the apply endpoint
              await apiClient.applyChanges(response.taskId);

              // Wait for application to complete
              let applied = false;
              while (!applied) {
                await new Promise((resolve) => setTimeout(resolve, 2000));
                const applyStatus = await apiClient.getTaskStatus(response.taskId);

                if (applyStatus.progress && applyStatus.progress.currentAction !== lastAction) {
                  lastAction = applyStatus.progress.currentAction;
                  spinner.update(lastAction);
                }

                if (applyStatus.progress?.currentAction === 'Changes applied') {
                  applied = true;
                  spinner.succeed('Changes applied successfully!');

                  if (applyStatus.result?.filesModified) {
                    Logger.newLine();
                    Logger.info('Files modified:');
                    applyStatus.result.filesModified.forEach((file: string) => {
                      Logger.log(`  ✓ ${file}`);
                    });
                  }
                  break;
                } else if (applyStatus.status === 'failed') {
                  applied = true;
                  spinner.fail('Failed to apply changes');
                  Logger.error(applyStatus.error || 'Unknown error');
                  break;
                }
              }

              Logger.newLine();
            } else {
              Logger.info('Changes not applied. You can review them manually.');
              return;
            }
          } else {
            // No plan means changes were already applied (shouldn't happen with preview mode)
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
            Logger.newLine();
          }

          // Changes applied successfully - no need to save to database
          // Just continue with the next prompt
        }
      } else if (status.status === 'failed') {
        completed = true;
        spinner.fail('Task failed');
        Logger.error(status.error || 'Unknown error');
      }
    }

    Logger.newLine();
  } catch (error: any) {
    spinner.fail('Error');
    throw error;
  }
}

async function handleSlashCommand(command: string): Promise<void> {
  const cmd = command.toLowerCase();

  switch (cmd) {
    case '/help':
      Logger.section('Available Commands');
      Logger.log('/help     - Show this help message');
      Logger.log('/clear    - Clear the screen');
      Logger.log('/status   - Show current session status');
      Logger.log('/voice    - Start voice input mode');
      Logger.log('exit      - Exit interactive mode');
      break;

    case '/clear':
      console.clear();
      Logger.header('Mikasa Interactive Mode');
      break;

    case '/status':
      const sessionManager = new SessionManager();
      Logger.section('Session Status');
      Logger.log(`Session ID: ${sessionManager.getSessionId()}`);
      Logger.log(`User ID: ${sessionManager.getUserId()}`);
      Logger.log(`Working Directory: ${process.cwd()}`);
      break;

    case '/voice':
      Logger.info('Voice mode coming soon...');
      break;

    default:
      Logger.error(`Unknown command: ${command}`);
      Logger.info('Type /help for available commands');
  }

  Logger.newLine();
}
