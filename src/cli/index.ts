#!/usr/bin/env node

/**
 * Mikasa CLI Entry Point
 * Follows Claude Code CLI behavior with interactive REPL and print modes
 */

import { Command } from 'commander';
import {
  initCommand,
  voiceCommand,
  runCommand,
  statusCommand,
  modelListCommand,
  modelSetCommand,
  interactiveCommand,
} from './commands';
import { Logger } from './ui/logger';

const program = new Command();

program
  .name('mikasa')
  .description('AI-powered code generation CLI with voice support')
  .version('1.0.0');

// Default action - Interactive REPL mode (like Claude Code CLI)
// Usage:
//   mikasa                          -> Start interactive REPL
//   mikasa "your prompt"            -> Start interactive REPL with initial prompt
//   mikasa -p "your prompt"         -> Print mode (execute once and exit)
//   mikasa -v                       -> Voice mode
program
  .argument('[prompt...]', 'Optional initial prompt for interactive mode')
  .option('-p, --print', 'Print mode - execute once and exit (non-interactive)')
  .option('-m, --model <model>', 'LLM model to use')
  .option('-a, --autonomous', 'Fully autonomous mode')
  .option('-v, --voice', 'Use voice input')
  .action(async (promptArgs, options) => {
    try {
      // If voice flag is set, use voice command
      if (options.voice) {
        await voiceCommand(options);
        return;
      }

      const prompt = promptArgs && promptArgs.length > 0 ? promptArgs.join(' ') : undefined;

      // Print mode (-p flag) - execute once and exit
      if (options.print) {
        if (!prompt) {
          Logger.error('Print mode requires a prompt');
          Logger.info('Usage: mikasa -p "your prompt"');
          process.exit(1);
        }
        await runCommand(prompt, options);
        return;
      }

      // Default: Interactive REPL mode
      await interactiveCommand(prompt, options);
    } catch (error: any) {
      Logger.error(error.message);
      process.exit(1);
    }
  });

// Init command
program
  .command('init')
  .description('Initialize Mikasa in current directory')
  .action(async () => {
    try {
      await initCommand();
    } catch (error: any) {
      Logger.error(error.message);
      process.exit(1);
    }
  });

// Voice command
program
  .command('voice')
  .description('Start voice input mode')
  .option('-m, --model <model>', 'LLM model to use')
  .option('-a, --autonomous', 'Fully autonomous mode')
  .action(async (options) => {
    try {
      await voiceCommand(options);
    } catch (error: any) {
      Logger.error(error.message);
      process.exit(1);
    }
  });

// Status command
program
  .command('status [taskId]')
  .description('Check current task status')
  .action(async (taskId) => {
    try {
      await statusCommand(taskId);
    } catch (error: any) {
      Logger.error(error.message);
      process.exit(1);
    }
  });

// Model commands
const model = program.command('model');

model
  .command('list')
  .description('List available models')
  .action(async () => {
    try {
      await modelListCommand();
    } catch (error: any) {
      Logger.error(error.message);
      process.exit(1);
    }
  });

model
  .command('set <name>')
  .description('Set default model')
  .action(async (name) => {
    try {
      await modelSetCommand(name);
    } catch (error: any) {
      Logger.error(error.message);
      process.exit(1);
    }
  });

// Parse arguments
program.parse(process.argv);
