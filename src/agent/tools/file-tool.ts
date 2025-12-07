/**
 * File Tool - Read, Write, and Patch Files
 */

import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { BaseTool, ToolExecutionResult } from './base-tool';
import { ToolExecutionError } from '../../shared/errors';
import { isPathSafe } from '../../shared/utils/file-utils';

const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);
const existsAsync = promisify(fs.exists);
const mkdirAsync = promisify(fs.mkdir);

export class FileTool extends BaseTool {
  name = 'file';
  description = 'Read, write, or patch files in the project directory';
  parameters = {
    type: 'object' as const,
    properties: {
      action: {
        type: 'string',
        enum: ['read', 'write', 'patch'],
        description: 'The file operation to perform',
      },
      path: {
        type: 'string',
        description: 'File path relative to project directory',
      },
      content: {
        type: 'string',
        description: 'Content to write (for write action)',
      },
      search: {
        type: 'string',
        description: 'Text to search for (for patch action)',
      },
      replace: {
        type: 'string',
        description: 'Text to replace with (for patch action)',
      },
    },
    required: ['action', 'path'],
  };

  private baseDir: string;

  constructor(baseDir?: string) {
    super();
    this.baseDir = baseDir || process.cwd();
  }

  async execute(params: Record<string, any>): Promise<ToolExecutionResult> {
    const { action, path: filePath, content, search, replace } = params;

    try {
      // Safety check: ensure file is within base directory
      if (!isPathSafe(filePath, this.baseDir)) {
        throw new ToolExecutionError(
          `Access denied: ${filePath} is outside the project directory`,
          this.name
        );
      }

      const absolutePath = path.resolve(this.baseDir, filePath);

      switch (action) {
        case 'read':
          return await this.readFile(absolutePath);

        case 'write':
          if (!content) {
            throw new Error('Content is required for write action');
          }
          return await this.writeFile(absolutePath, content);

        case 'patch':
          if (!search || replace === undefined) {
            throw new Error('Search and replace are required for patch action');
          }
          return await this.patchFile(absolutePath, search, replace);

        default:
          throw new Error(`Invalid action: ${action}`);
      }
    } catch (error: any) {
      return {
        success: false,
        output: '',
        error: error.message,
      };
    }
  }

  private async readFile(filePath: string): Promise<ToolExecutionResult> {
    try {
      const content = await readFileAsync(filePath, 'utf-8');
      return {
        success: true,
        output: content,
        metadata: {
          filePath,
          size: content.length,
        },
      };
    } catch (error: any) {
      throw new Error(`Failed to read file ${filePath}: ${error.message}`);
    }
  }

  private async writeFile(filePath: string, content: string): Promise<ToolExecutionResult> {
    try {
      // Ensure directory exists
      const dir = path.dirname(filePath);
      if (!await existsAsync(dir)) {
        await mkdirAsync(dir, { recursive: true });
      }

      await writeFileAsync(filePath, content, 'utf-8');

      return {
        success: true,
        output: `File written successfully: ${filePath}`,
        metadata: {
          filePath,
          filesModified: [filePath],
        },
      };
    } catch (error: any) {
      throw new Error(`Failed to write file ${filePath}: ${error.message}`);
    }
  }

  private async patchFile(
    filePath: string,
    search: string,
    replace: string
  ): Promise<ToolExecutionResult> {
    try {
      // Read current content
      const content = await readFileAsync(filePath, 'utf-8');

      // Check if search text exists
      if (!content.includes(search)) {
        throw new Error(`Search text not found in file: ${search.substring(0, 50)}...`);
      }

      // Replace
      const newContent = content.replace(search, replace);

      // Write back
      await writeFileAsync(filePath, newContent, 'utf-8');

      return {
        success: true,
        output: `File patched successfully: ${filePath}`,
        metadata: {
          filePath,
          filesModified: [filePath],
        },
      };
    } catch (error: any) {
      throw new Error(`Failed to patch file ${filePath}: ${error.message}`);
    }
  }
}
