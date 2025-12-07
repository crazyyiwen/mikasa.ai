/**
 * Input Validation Utilities
 */

export function validateRequired<T>(value: T | undefined | null, fieldName: string): T {
  if (value === undefined || value === null) {
    throw new Error(`${fieldName} is required`);
  }
  return value;
}

export function validateString(value: any, fieldName: string): string {
  if (typeof value !== 'string') {
    throw new Error(`${fieldName} must be a string`);
  }
  return value;
}

export function validateNumber(value: any, fieldName: string): number {
  if (typeof value !== 'number' || isNaN(value)) {
    throw new Error(`${fieldName} must be a valid number`);
  }
  return value;
}

export function validateBoolean(value: any, fieldName: string): boolean {
  if (typeof value !== 'boolean') {
    throw new Error(`${fieldName} must be a boolean`);
  }
  return value;
}

export function validateEnum<T>(value: any, validValues: readonly T[], fieldName: string): T {
  if (!validValues.includes(value)) {
    throw new Error(`${fieldName} must be one of: ${validValues.join(', ')}`);
  }
  return value as T;
}

export function validatePort(port: number): boolean {
  return port > 0 && port <= 65535;
}

export function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
