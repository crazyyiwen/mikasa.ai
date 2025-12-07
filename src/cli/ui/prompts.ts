/**
 * CLI User Prompts
 */

import * as readline from 'readline';

export class Prompts {
  static async confirm(question: string, defaultValue: boolean = true): Promise<boolean> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const defaultText = defaultValue ? 'Y/n' : 'y/N';
    const answer = await new Promise<string>((resolve) => {
      rl.question(`${question} (${defaultText}): `, resolve);
    });

    rl.close();

    if (!answer.trim()) {
      return defaultValue;
    }

    return answer.toLowerCase().startsWith('y');
  }

  static async input(question: string, defaultValue?: string): Promise<string> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const defaultText = defaultValue ? ` (${defaultValue})` : '';
    const answer = await new Promise<string>((resolve) => {
      rl.question(`${question}${defaultText}: `, resolve);
    });

    rl.close();

    return answer.trim() || defaultValue || '';
  }

  static async select(question: string, choices: string[]): Promise<string> {
    console.log(`\n${question}`);
    choices.forEach((choice, index) => {
      console.log(`  ${index + 1}. ${choice}`);
    });

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const answer = await new Promise<string>((resolve) => {
      rl.question('\nSelect (number): ', resolve);
    });

    rl.close();

    const index = parseInt(answer.trim()) - 1;
    if (index >= 0 && index < choices.length) {
      return choices[index];
    }

    return choices[0];
  }

  static async waitForEnter(message: string = 'Press Enter to continue...'): Promise<void> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    await new Promise<void>((resolve) => {
      rl.question(message, () => resolve());
    });

    rl.close();
  }
}
