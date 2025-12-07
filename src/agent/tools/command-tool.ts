/**
 * Command Tool - Execute Shell Commands
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { BaseTool, ToolExecutionResult } from './base-tool';
import { ToolExecutionError } from '../../shared/errors';

const execAsync = promisify(exec);

export class CommandTool extends BaseTool {
  name = 'command';
  description = 'Execute shell commands (npm, git, build tools, etc.)';
  parameters = {
    type: 'object' as const,
    properties: {
      command: {
        type: 'string',
        description: 'The shell command to execute',
      },
      cwd: {
        type: 'string',
        description: 'Working directory for the command (optional)',
      },
    },
    required: ['command'],
  };

  private allowShellCommands: boolean;
  private baseDir: string;

  constructor(baseDir?: string, allowShellCommands: boolean = true) {
    super();
    this.baseDir = baseDir || process.cwd();
    this.allowShellCommands = allowShellCommands;
  }

  async execute(params: Record<string, any>): Promise<ToolExecutionResult> {
    const { command, cwd } = params;

    if (!this.allowShellCommands) {
      return {
        success: false,
        output: '',
        error: 'Shell command execution is disabled in agent configuration',
      };
    }

    try {
      // Safety: Block potentially dangerous commands
      if (this.isDangerousCommand(command)) {
        throw new ToolExecutionError(
          `Command blocked for safety: ${command}`,
          this.name
        );
      }

      const workingDir = cwd || this.baseDir;
      const startTime = Date.now();

      const { stdout, stderr } = await execAsync(command, {
        cwd: workingDir,
        timeout: 60000, // 1 minute timeout
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer
      });

      const duration = Date.now() - startTime;
      const output = stdout || stderr;

      return {
        success: true,
        output: output.trim(),
        metadata: {
          command,
          exitCode: 0,
          duration,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
        },
      };
    } catch (error: any) {
      const duration = Date.now() - (error.startTime || Date.now());

      return {
        success: false,
        output: (error.stdout || '') + '\n' + (error.stderr || ''),
        error: error.message,
        metadata: {
          command,
          exitCode: error.code || 1,
          duration,
          stdout: error.stdout || '',
          stderr: error.stderr || '',
        },
      };
    }
  }

  private isDangerousCommand(command: string): boolean {
    const dangerous = [
      'rm -rf /',
      'rm -rf ~',
      'rm -rf *',
      'mkfs',
      'dd if=',
      ':(){:|:&};:',
      'curl | sh',
      'wget | sh',
      'shutdown',
      'reboot',
      'init 0',
      'init 6',
    ];

    const lowerCommand = command.toLowerCase();
    return dangerous.some((d) => lowerCommand.includes(d.toLowerCase()));
  }
}
