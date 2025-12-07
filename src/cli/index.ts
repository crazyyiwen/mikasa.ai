#!/usr/bin/env node

/**
 * Mikasa CLI Entry Point
 */

import { Command } from 'commander';
import {
  initCommand,
  voiceCommand,
  runCommand,
  statusCommand,
  modelListCommand,
  modelSetCommand,
} from './commands';
import { Logger } from './ui/logger';

const program = new Command();

program
  .name('mikasa')
  .description('AI-powered code generation CLI with voice support')
  .version('1.0.0');

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

// Run command
program
  .command('run <prompt>')
  .description('Run code generation with text prompt')
  .option('-m, --model <model>', 'LLM model to use')
  .option('-a, --autonomous', 'Fully autonomous mode')
  .action(async (prompt, options) => {
    try {
      await runCommand(prompt, options);
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

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
