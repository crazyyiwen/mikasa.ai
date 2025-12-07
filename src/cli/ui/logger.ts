/**
 * CLI Logger with Colors and Formatting
 */

import chalk from 'chalk';

export class Logger {
  static info(message: string, ...args: any[]): void {
    console.log(chalk.blue('ℹ'), message, ...args);
  }

  static success(message: string, ...args: any[]): void {
    console.log(chalk.green('✓'), message, ...args);
  }

  static warn(message: string, ...args: any[]): void {
    console.log(chalk.yellow('⚠'), message, ...args);
  }

  static error(message: string, ...args: any[]): void {
    console.error(chalk.red('✗'), message, ...args);
  }

  static debug(message: string, ...args: any[]): void {
    if (process.env.DEBUG) {
      console.log(chalk.gray('🔍'), message, ...args);
    }
  }

  static header(message: string): void {
    console.log('\n' + chalk.bold.cyan(message));
    console.log(chalk.cyan('─'.repeat(message.length)) + '\n');
  }

  static section(message: string): void {
    console.log('\n' + chalk.bold(message));
  }

  static log(message: string, ...args: any[]): void {
    console.log(message, ...args);
  }

  static newLine(): void {
    console.log();
  }
}
