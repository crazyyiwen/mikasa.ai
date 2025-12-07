/**
 * File System Utilities
 */

import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);
const existsAsync = promisify(fs.exists);
const mkdirAsync = promisify(fs.mkdir);
const unlinkAsync = promisify(fs.unlink);

export async function readFile(filePath: string): Promise<string> {
  return readFileAsync(filePath, 'utf-8');
}

export async function writeFile(filePath: string, content: string): Promise<void> {
  const dir = path.dirname(filePath);
  if (!await existsAsync(dir)) {
    await mkdirAsync(dir, { recursive: true });
  }
  await writeFileAsync(filePath, content, 'utf-8');
}

export async function fileExists(filePath: string): Promise<boolean> {
  return existsAsync(filePath);
}

export async function deleteFile(filePath: string): Promise<void> {
  if (await fileExists(filePath)) {
    await unlinkAsync(filePath);
  }
}

export async function ensureDirectory(dirPath: string): Promise<void> {
  if (!await existsAsync(dirPath)) {
    await mkdirAsync(dirPath, { recursive: true });
  }
}

export function getAbsolutePath(relativePath: string, basePath?: string): string {
  if (path.isAbsolute(relativePath)) {
    return relativePath;
  }
  return path.resolve(basePath || process.cwd(), relativePath);
}

export function isPathSafe(targetPath: string, basePath: string): boolean {
  const resolvedPath = path.resolve(basePath, targetPath);
  const resolvedBase = path.resolve(basePath);
  return resolvedPath.startsWith(resolvedBase);
}
