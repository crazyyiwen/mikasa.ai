/**
 * Git Tool - Git Operations
 */

import simpleGit, { SimpleGit } from 'simple-git';
import { exec } from 'child_process';
import { promisify } from 'util';
import { BaseTool, ToolExecutionResult } from './base-tool';
import { ToolExecutionError } from '../../shared/errors';

const execAsync = promisify(exec);

export class GitTool extends BaseTool {
  name = 'git';
  description = 'Perform Git operations: status, commit, branch, push, create PR';
  parameters = {
    type: 'object' as const,
    properties: {
      action: {
        type: 'string',
        enum: ['status', 'commit', 'branch', 'push', 'pr'],
        description: 'The Git operation to perform',
      },
      message: {
        type: 'string',
        description: 'Commit message (for commit action)',
      },
      branchName: {
        type: 'string',
        description: 'Branch name (for branch action)',
      },
      prTitle: {
        type: 'string',
        description: 'Pull request title (for pr action)',
      },
      prBody: {
        type: 'string',
        description: 'Pull request description (for pr action)',
      },
    },
    required: ['action'],
  };

  private git: SimpleGit;
  private allowGitPush: boolean;

  constructor(baseDir?: string, allowGitPush: boolean = true) {
    super();
    this.git = simpleGit(baseDir || process.cwd());
    this.allowGitPush = allowGitPush;
  }

  async execute(params: Record<string, any>): Promise<ToolExecutionResult> {
    const { action, operation, message, branchName, prTitle, prBody } = params;
    const op = operation || action; // Support both 'operation' and 'action'

    try {
      switch (op) {
        case 'status':
          return await this.getStatus();

        case 'commit':
          const commitMsg = params.params?.message || message;
          if (!commitMsg) {
            throw new Error('Commit message is required');
          }
          return await this.commit(commitMsg);

        case 'branch':
          const branch = params.params?.name || branchName;
          if (!branch) {
            throw new Error('Branch name is required');
          }
          if (params.params?.checkout) {
            return await this.createBranch(branch);
          }
          return await this.createBranchOnly(branch);

        case 'add':
          const files = params.params?.files || ['.'];
          return await this.addFiles(files);

        case 'push':
          if (!this.allowGitPush) {
            throw new ToolExecutionError('Git push is disabled in agent configuration', this.name);
          }
          const pushBranch = params.params?.branch;
          const setUpstream = params.params?.setUpstream;
          return await this.push(pushBranch, setUpstream);

        case 'pr':
        case 'createPR':
          const title = params.params?.title || prTitle;
          const body = params.params?.body || prBody;
          if (!title || !body) {
            throw new Error('PR title and body are required');
          }
          const base = params.params?.base || 'main';
          const head = params.params?.head;
          return await this.createPR(title, body, base, head);

        default:
          throw new Error(`Invalid operation: ${op}`);
      }
    } catch (error: any) {
      return {
        success: false,
        output: '',
        error: error.message,
      };
    }
  }

  private async getStatus(): Promise<ToolExecutionResult> {
    try {
      const status = await this.git.status();

      const output = [
        `Current branch: ${status.current}`,
        `Modified files: ${status.modified.length}`,
        `Added files: ${status.created.length}`,
        `Deleted files: ${status.deleted.length}`,
        `Untracked files: ${status.not_added.length}`,
        '',
        'Files:',
        ...status.modified.map((f) => `  M ${f}`),
        ...status.created.map((f) => `  A ${f}`),
        ...status.deleted.map((f) => `  D ${f}`),
        ...status.not_added.map((f) => `  ? ${f}`),
      ].join('\n');

      return {
        success: true,
        output,
        metadata: {
          branch: status.current,
          modified: status.modified,
          created: status.created,
          deleted: status.deleted,
          untracked: status.not_added,
        },
      };
    } catch (error: any) {
      throw new Error(`Failed to get git status: ${error.message}`);
    }
  }

  private async commit(message: string): Promise<ToolExecutionResult> {
    try {
      // Get status to see what files exist
      const status = await this.git.status();

      // Collect all files that need to be staged
      const filesToAdd = [
        ...status.modified,
        ...status.created,
        ...status.deleted,
        ...status.not_added,
      ];

      if (filesToAdd.length === 0) {
        return {
          success: false,
          output: 'No changes to commit',
          error: 'Working directory is clean',
        };
      }

      // Filter out Windows reserved names and invalid paths
      const WINDOWS_RESERVED = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'LPT1', 'LPT2', 'LPT3'];
      const validFiles = filesToAdd.filter(file => {
        const fileName = file.split(/[/\\]/).pop()?.toUpperCase();
        return fileName && !WINDOWS_RESERVED.includes(fileName);
      });

      if (validFiles.length === 0) {
        return {
          success: false,
          output: 'No valid files to commit',
          error: 'All files are invalid or Windows reserved names',
        };
      }

      // Stage only valid files
      await this.git.add(validFiles);

      // Commit
      const result = await this.git.commit(message);

      return {
        success: true,
        output: `Committed: ${message}\nCommit hash: ${result.commit}\nFiles: ${validFiles.length}`,
        metadata: {
          commit: result.commit,
          message,
          filesCommitted: validFiles.length,
        },
      };
    } catch (error: any) {
      throw new Error(`Failed to commit: ${error.message}`);
    }
  }

  private async createBranch(branchName: string): Promise<ToolExecutionResult> {
    try {
      await this.git.checkoutLocalBranch(branchName);

      return {
        success: true,
        output: `Created and switched to branch: ${branchName}`,
        metadata: {
          branch: branchName,
        },
      };
    } catch (error: any) {
      throw new Error(`Failed to create branch: ${error.message}`);
    }
  }

  private async createBranchOnly(branchName: string): Promise<ToolExecutionResult> {
    try {
      await this.git.branch([branchName]);

      return {
        success: true,
        output: `Created branch: ${branchName}`,
        metadata: {
          branch: branchName,
        },
      };
    } catch (error: any) {
      throw new Error(`Failed to create branch: ${error.message}`);
    }
  }

  private async addFiles(files: string[]): Promise<ToolExecutionResult> {
    try {
      await this.git.add(files);

      return {
        success: true,
        output: `Staged files: ${files.join(', ')}`,
        metadata: {
          files,
        },
      };
    } catch (error: any) {
      throw new Error(`Failed to add files: ${error.message}`);
    }
  }

  private async push(branch?: string, setUpstream?: boolean): Promise<ToolExecutionResult> {
    try {
      const status = await this.git.status();
      const currentBranch = branch || status.current;

      if (!currentBranch) {
        throw new Error('No current branch');
      }

      const options = setUpstream ? ['--set-upstream'] : [];
      await this.git.push('origin', currentBranch, options);

      return {
        success: true,
        output: `Pushed branch ${currentBranch} to origin`,
        metadata: {
          branch: currentBranch,
        },
      };
    } catch (error: any) {
      throw new Error(`Failed to push: ${error.message}`);
    }
  }

  private async createPR(title: string, body: string, base?: string, head?: string): Promise<ToolExecutionResult> {
    try {
      // Use GitHub CLI to create PR
      let command = `gh pr create --title "${title}" --body "${body}"`;

      if (base) {
        command += ` --base "${base}"`;
      }

      if (head) {
        command += ` --head "${head}"`;
      }

      const { stdout } = await execAsync(command);

      const prUrl = stdout.trim();

      return {
        success: true,
        output: prUrl,
        metadata: {
          prUrl,
          title,
          base,
          head,
        },
      };
    } catch (error: any) {
      // If gh CLI is not available, provide instructions
      if (error.message.includes('command not found') || error.message.includes('not recognized')) {
        return {
          success: false,
          output: '',
          error: 'GitHub CLI (gh) is not installed. Install it from https://cli.github.com/',
        };
      }

      throw new Error(`Failed to create PR: ${error.message}`);
    }
  }
}
